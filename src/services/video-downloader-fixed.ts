import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";

export interface VideoInfo {
  title: string;
  duration: number;
  thumbnailUrl?: string;
  author?: string;
  views?: string;
  formats: VideoFormat[];
}

export interface VideoFormat {
  quality: string;
  fileSize: number;
  format: string;
}

export class VideoDownloaderService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), "temp_downloads");
    this.ensureTempDir();
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  detectPlatform(url: string): string | null {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('facebook.com') || urlLower.includes('fb.watch')) {
      return 'facebook';
    } else if (urlLower.includes('tiktok.com')) {
      return 'tiktok';
    } else if (urlLower.includes('pinterest.com')) {
      return 'pinterest';
    } else if (urlLower.includes('instagram.com') || urlLower.includes('instagr.am')) {
      return 'instagram';
    }
    return null;
  }

  async getVideoInfo(url: string): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      const ytdlp = spawn('yt-dlp', [
        '--dump-json',
        '--no-playlist',
        '--format', 'best[ext=mp4]/best',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '--add-headers', 'Accept-Language:en-US,en;q=0.9',
        '--no-check-certificates',
        '--cookies-from-browser', 'chrome',
        '--extractor-retries', '3',
        '--fragment-retries', '3',
        '--retry-sleep', 'linear=1:5:2',
        url
      ]);

      let output = '';
      let errorOutput = '';

      ytdlp.stdout.on('data', (data) => {
        output += data.toString();
      });

      ytdlp.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ytdlp.on('close', (code) => {
        if (code === 0) {
          try {
            const lines = output.trim().split('\n');
            const info = JSON.parse(lines[lines.length - 1]);
            
            const formats: VideoFormat[] = [
              { quality: 'low', fileSize: this.estimateFileSize(info.duration, 'low'), format: 'mp4' },
              { quality: 'medium', fileSize: this.estimateFileSize(info.duration, 'medium'), format: 'mp4' },
              { quality: 'high', fileSize: this.estimateFileSize(info.duration, 'high'), format: 'mp4' },
              { quality: '2k', fileSize: this.estimateFileSize(info.duration, '2k'), format: 'mp4' },
              { quality: '4k', fileSize: this.estimateFileSize(info.duration, '4k'), format: 'mp4' }
            ];

            resolve({
              title: info.title || 'Unknown Video',
              duration: info.duration || 0,
              thumbnailUrl: info.thumbnail || info.thumbnails?.[0]?.url,
              author: info.uploader || info.channel || info.uploader_id,
              views: info.view_count ? this.formatViews(info.view_count) : undefined,
              formats
            });
          } catch (error) {
            console.error('JSON parse error:', error);
            reject(new Error(`Failed to parse video info: ${error}`));
          }
        } else {
          console.error('yt-dlp failed with code:', code);
          console.error('Error output:', errorOutput);
          
          const errorMessage = this.getHelpfulErrorMessage(url, errorOutput);
          reject(new Error(errorMessage));
        }
      });

      ytdlp.on('error', (error) => {
        reject(new Error(`Failed to spawn yt-dlp: ${error.message}`));
      });
    });
  }

  private getHelpfulErrorMessage(url: string, errorOutput: string): string {
    const platform = this.detectPlatform(url);
    
    // Platform-specific error messages
    if (platform === 'tiktok') {
      if (errorOutput.includes('status code 10204') || errorOutput.includes('Video not available')) {
        return 'Unable to access this TikTok video. It may be private, deleted, or region-restricted.';
      }
    }
    
    if (platform === 'facebook') {
      if (errorOutput.includes('No video formats found')) {
        return 'Unable to access this Facebook video. It may be private or require login.';
      }
    }
    
    if (platform === 'instagram' || platform === 'pinterest') {
      if (errorOutput.includes('login') || errorOutput.includes('Sign in')) {
        return `Unable to access this ${platform} content. The video may be private or require authentication.`;
      }
    }
    
    // Generic messages
    if (errorOutput.includes('Video unavailable') || errorOutput.includes('Private video')) {
      return 'Video is unavailable, private, or may have been deleted.';
    }
    
    if (errorOutput.includes('Sign in') || errorOutput.includes('login')) {
      return 'Video requires authentication to access. Please try a public video.';
    }
    
    return 'Unable to process video. Please check the URL and try again.';
  }

  private estimateFileSize(duration: number, quality: string): number {
    if (!duration) return 10000000; // 10MB default
    
    const bitrates = {
      low: 500000,      // ~0.5 Mbps
      medium: 1000000,  // ~1 Mbps  
      high: 2000000,    // ~2 Mbps
      '2k': 4000000,    // ~4 Mbps
      '4k': 8000000     // ~8 Mbps
    };
    
    const bitrate = bitrates[quality as keyof typeof bitrates] || bitrates.medium;
    return Math.floor(duration * bitrate / 8);
  }

  private formatViews(views: number): string {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  }

  async downloadVideoTemporarily(
    url: string, 
    quality: string,
    onProgress?: (progress: number) => void
  ): Promise<{ filePath: string; fileSize: number; cleanup: () => Promise<void> }> {
    
    const timestamp = Date.now();
    const uniqueId = randomBytes(8).toString('hex');
    const filename = `video_${timestamp}_${uniqueId}`;
    const outputTemplate = path.join(this.tempDir, `${filename}.%(ext)s`);

    const qualityMap: Record<string, string> = {
      high: 'best[height<=1080][ext=mp4]/best[ext=mp4]/best',
      medium: 'best[height<=720][ext=mp4]/best[height<=720]/worstvideo[height>=480][ext=mp4]',
      low: 'worst[height>=360][ext=mp4]/worst[ext=mp4]/worst',
      '2k': 'best[height<=1440][ext=mp4]/best[height<=1440]/best[ext=mp4]',
      '4k': 'best[height<=2160][ext=mp4]/best[height<=2160]/best[ext=mp4]'
    };

    return new Promise((resolve, reject) => {
      const ytdlp = spawn('yt-dlp', [
        '--format', qualityMap[quality] || 'best[ext=mp4]/best',
        '--output', outputTemplate,
        '--newline',
        '--no-warnings',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '--add-headers', 'Accept-Language:en-US,en;q=0.9',
        '--no-check-certificates',
        '--cookies-from-browser', 'chrome',
        '--extractor-retries', '3',
        '--fragment-retries', '3',
        '--retry-sleep', 'linear=1:5:2',
        url
      ]);

      let errorOutput = '';
      let lastProgress = 0;

      ytdlp.stdout.on('data', (data) => {
        const output = data.toString();
        
        const lines = output.split('\n');
        for (const line of lines) {
          const progressMatch = line.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
          if (progressMatch && onProgress) {
            const progress = parseFloat(progressMatch[1]);
            if (progress > lastProgress) {
              lastProgress = progress;
              onProgress(progress);
            }
          }
        }
      });

      ytdlp.stderr.on('data', (data) => {
        const error = data.toString();
        errorOutput += error;
        
        const progressMatch = error.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
        if (progressMatch && onProgress) {
          const progress = parseFloat(progressMatch[1]);
          if (progress > lastProgress) {
            lastProgress = progress;
            onProgress(progress);
          }
        }
      });

      ytdlp.on('close', async (code) => {
        if (code === 0) {
          try {
            const files = await fs.readdir(this.tempDir);
            const downloadedFile = files.find(file => file.startsWith(`video_${timestamp}_${uniqueId}`));
            
            if (downloadedFile) {
              const filePath = path.join(this.tempDir, downloadedFile);
              const stats = await fs.stat(filePath);
              
              const cleanup = async () => {
                try {
                  await fs.unlink(filePath);
                } catch (error) {
                  console.error('Failed to cleanup file:', error);
                }
              };
              
              resolve({
                filePath,
                fileSize: stats.size,
                cleanup
              });
            } else {
              reject(new Error('Downloaded file not found'));
            }
          } catch (error) {
            reject(new Error(`Failed to find downloaded file: ${error}`));
          }
        } else {
          const errorMessage = this.getHelpfulErrorMessage(url, errorOutput);
          reject(new Error(errorMessage));
        }
      });

      ytdlp.on('error', (error) => {
        reject(new Error(`Failed to spawn yt-dlp: ${error.message}`));
      });
    });
  }
}