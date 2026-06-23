import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class IpfsService {
  private ipfsGateway: string;
  private ipfsApiUrl: string;

  constructor(private configService: ConfigService) {
    this.ipfsGateway = this.configService.get('IPFS_GATEWAY', 'https://ipfs.io/ipfs/');
    this.ipfsApiUrl = this.configService.get('IPFS_API_URL', 'http://localhost:5001');
  }

  /**
   * 上传数据到 IPFS
   */
  async upload(data: string | Buffer): Promise<string> {
    try {
      const formData = new FormData();
      const blob = new Blob([data]);
      formData.append('file', blob);

      const response = await axios.post(`${this.ipfsApiUrl}/api/v0/add`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return response.data.Hash;
    } catch (error) {
      // 如果本地IPFS不可用，尝试使用远程API
      try {
        const formData = await this.createFormData(data);
        const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', 
          formData, 
          {
            headers: {
              ...(formData as any).getHeaders?.() || {},
              'pinata_api_key': this.configService.get('PINATA_API_KEY'),
              'pinata_secret_api_key': this.configService.get('PINATA_SECRET_KEY'),
            },
          }
        );
        return response.data.IpfsHash;
      } catch (pinataError) {
        throw new Error(`IPFS upload failed: ${error.message}`);
      }
    }
  }

  /**
   * 上传 JSON 数据到 IPFS
   */
  async uploadJson(data: object): Promise<string> {
    const jsonString = JSON.stringify(data);
    return this.upload(jsonString);
  }

  /**
   * 从 IPFS 读取数据
   */
  async download(cid: string): Promise<Buffer> {
    try {
      const response = await axios.get(`${this.ipfsGateway}${cid}`, {
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`IPFS download failed: ${error.message}`);
    }
  }

  /**
   * 从 IPFS 读取 JSON 数据
   */
  async downloadJson<T>(cid: string): Promise<T> {
    const buffer = await this.download(cid);
    return JSON.parse(buffer.toString());
  }

  /**
   * Pin 文件以确保持久存储
   */
  async pin(cid: string): Promise<boolean> {
    try {
      await axios.post(`${this.ipfsApiUrl}/api/v0/pin/add?arg=${cid}`);
      return true;
    } catch (error) {
      // 尝试使用 Pinata
      try {
        await axios.post('https://api.pinata.cloud/pinning/pinByHash', {
          hashToPin: cid,
        }, {
          headers: {
            'pinata_api_key': this.configService.get('PINATA_API_KEY'),
            'pinata_secret_api_key': this.configService.get('PINATA_SECRET_KEY'),
          },
        });
        return true;
      } catch (pinataError) {
        return false;
      }
    }
  }

  /**
   * 验证 CID 是否存在
   */
  async exists(cid: string): Promise<boolean> {
    try {
      await this.download(cid);
      return true;
    } catch {
      return false;
    }
  }

  private async createFormData(data: string | Buffer): Promise<FormData> {
    const formData = new FormData();
    const blob = new Blob([data]);
    formData.append('file', blob);
    return formData;
  }
}