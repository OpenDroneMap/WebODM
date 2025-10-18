import { Logger } from '../utils/Logger';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  hasGPS: boolean;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  timestamp?: Date;
  camera?: {
    make?: string;
    model?: string;
    lens?: string;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: ImageMetadata;
}

export class FileHandler {
  private logger: Logger;
  private supportedFormats: string[] = ['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.bmp', '.webp'];
  private maxFileSize: number = 100 * 1024 * 1024; // 100MB

  constructor() {
    this.logger = new Logger('FileHandler');
  }

  async validateImageFormat(filePath: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        errors.push('File does not exist');
        return { valid: false, errors, warnings };
      }

      // Check file extension
      const ext = path.extname(filePath).toLowerCase();
      if (!this.supportedFormats.includes(ext)) {
        errors.push(`Unsupported file format: ${ext}. Supported formats: ${this.supportedFormats.join(', ')}`);
        return { valid: false, errors, warnings };
      }

      // Check file size
      const stats = await stat(filePath);
      if (stats.size > this.maxFileSize) {
        errors.push(`File too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB. Maximum size: ${this.maxFileSize / 1024 / 1024}MB`);
        return { valid: false, errors, warnings };
      }

      if (stats.size === 0) {
        errors.push('File is empty');
        return { valid: false, errors, warnings };
      }

      // Extract metadata
      const metadata = await this.extractEXIF(filePath);
      
      // Validate image dimensions
      if (metadata.width < 100 || metadata.height < 100) {
        warnings.push('Image dimensions are very small, may affect processing quality');
      }

      // Check for GPS data
      if (!metadata.hasGPS) {
        warnings.push('Image does not contain GPS data, may affect georeferencing accuracy');
      }

      return {
        valid: true,
        errors,
        warnings,
        metadata
      };

    } catch (error) {
      this.logger.error('Failed to validate image format', error);
      return {
        valid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings
      };
    }
  }

  async validateGCPFile(filePath: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (!fs.existsSync(filePath)) {
        errors.push('GCP file does not exist');
        return { valid: false, errors, warnings };
      }

      const content = await readFile(filePath, 'utf8');
      const lines = content.trim().split('\n');

      if (lines.length === 0) {
        errors.push('GCP file is empty');
        return { valid: false, errors, warnings };
      }

      // Validate GCP format (basic validation)
      let validPoints = 0;
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 4) {
          const [id, x, y, lat, lon] = parts;
          
          // Check if coordinates are numeric
          if (!isNaN(parseFloat(x)) && !isNaN(parseFloat(y)) && 
              !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon))) {
            validPoints++;
          }
        }
      }

      if (validPoints === 0) {
        errors.push('No valid GCP points found in file');
        return { valid: false, errors, warnings };
      }

      if (validPoints < 3) {
        warnings.push('Less than 3 GCP points found, may affect processing accuracy');
      }

      return {
        valid: true,
        errors,
        warnings
      };

    } catch (error) {
      this.logger.error('Failed to validate GCP file', error);
      return {
        valid: false,
        errors: [`GCP validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings
      };
    }
  }

  async convertFormat(filePath: string, targetFormat: string): Promise<string> {
    // Note: This is a placeholder implementation
    // In a real implementation, you'd use a library like sharp or imagemagick
    this.logger.warn('Format conversion not implemented', { filePath, targetFormat });
    throw new Error('Format conversion not implemented');
  }

  async prepareImageBatch(files: string[]): Promise<{
    valid: string[];
    invalid: string[];
    metadata: Map<string, ImageMetadata>;
  }> {
    const valid: string[] = [];
    const invalid: string[] = [];
    const metadata = new Map<string, ImageMetadata>();

    this.logger.info(`Preparing batch of ${files.length} images`);

    for (const file of files) {
      try {
        const result = await this.validateImageFormat(file);
        if (result.valid) {
          valid.push(file);
          if (result.metadata) {
            metadata.set(file, result.metadata);
          }
        } else {
          invalid.push(file);
          this.logger.warn(`Invalid image file: ${file}`, { errors: result.errors });
        }
      } catch (error) {
        invalid.push(file);
        this.logger.error(`Failed to process image: ${file}`, error);
      }
    }

    this.logger.info(`Batch preparation complete: ${valid.length} valid, ${invalid.length} invalid`);
    return { valid, invalid, metadata };
  }

  async validateImageSet(files: string[]): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    coverage?: {
      hasGPS: number;
      total: number;
      percentage: number;
    };
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let hasGPS = 0;

    if (files.length === 0) {
      errors.push('No images provided');
      return { valid: false, errors, warnings };
    }

    if (files.length < 3) {
      warnings.push('Less than 3 images provided, may affect processing quality');
    }

    // Validate each image
    for (const file of files) {
      const result = await this.validateImageFormat(file);
      if (!result.valid) {
        errors.push(`${file}: ${result.errors.join(', ')}`);
      } else {
        if (result.metadata?.hasGPS) {
          hasGPS++;
        }
      }
    }

    const coverage = {
      hasGPS,
      total: files.length,
      percentage: (hasGPS / files.length) * 100
    };

    if (coverage.percentage < 50) {
      warnings.push(`Only ${coverage.percentage.toFixed(1)}% of images have GPS data`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      coverage
    };
  }

  async extractEXIF(filePath: string): Promise<ImageMetadata> {
    // Note: This is a placeholder implementation
    // In a real implementation, you'd use a library like exif-reader or piexifjs
    this.logger.warn('EXIF extraction not implemented', { filePath });
    
    // Return mock data for now
    return {
      width: 1920,
      height: 1080,
      format: path.extname(filePath).toLowerCase(),
      size: 0,
      hasGPS: false
    };
  }

  async validateGeotags(files: string[]): Promise<{
    valid: boolean;
    errors: string[];
    coverage: {
      hasGPS: number;
      total: number;
      percentage: number;
    };
  }> {
    let hasGPS = 0;
    const errors: string[] = [];

    for (const file of files) {
      try {
        const metadata = await this.extractEXIF(file);
        if (metadata.hasGPS) {
          hasGPS++;
        }
      } catch (error) {
        errors.push(`Failed to extract EXIF from ${file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const coverage = {
      hasGPS,
      total: files.length,
      percentage: (hasGPS / files.length) * 100
    };

    return {
      valid: errors.length === 0,
      errors,
      coverage
    };
  }

  getSupportedFormats(): string[] {
    return [...this.supportedFormats];
  }

  setMaxFileSize(sizeInMB: number): void {
    this.maxFileSize = sizeInMB * 1024 * 1024;
    this.logger.info(`Max file size set to ${sizeInMB}MB`);
  }
}
