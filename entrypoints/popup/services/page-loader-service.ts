import { browser } from 'wxt/browser';

export interface PageInfo {
  url: string;
  method: string;
  headers: { name: string; value: string }[];
  cookies: string;
}

export interface ContentTypeOption {
  label: string;
  value: string;
}

export const CONTENT_TYPES: ContentTypeOption[] = [
  { label: 'application/json', value: 'application/json' },
  { label: 'application/x-www-form-urlencoded', value: 'application/x-www-form-urlencoded' },
  { label: 'multipart/form-data', value: 'multipart/form-data' },
  { label: 'text/plain', value: 'text/plain' },
  { label: 'application/xml', value: 'application/xml' },
  { label: 'text/html', value: 'text/html' },
];

class PageLoaderService {
  async loadCurrentPage(): Promise<PageInfo> {
    try {
      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });

      if (!activeTab || !activeTab.url) {
        throw new Error('无法获取当前标签页信息');
      }

      const url = activeTab.url;
      const urlObj = new URL(url);

      // 获取 Cookie
      const cookies = await browser.cookies.getAll({ url });
      const cookieString = cookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');

      // 构建标准请求头
      const headers: { name: string; value: string }[] = [
        { name: 'Host', value: urlObj.host },
        { name: 'User-Agent', value: navigator.userAgent },
        { name: 'Accept', value: '*/*' },
        { name: 'Accept-Language', value: 'zh-CN,zh;q=0.9,en;q=0.8' },
        { name: 'Accept-Encoding', value: 'gzip, deflate, br' },
        { name: 'Connection', value: 'keep-alive' },
      ];

      // 如果有 Cookie，添加到请求头
      if (cookieString) {
        headers.push({ name: 'Cookie', value: cookieString });
      }

      // 如果是 HTTPS，添加 Referer
      if (urlObj.protocol === 'https:') {
        headers.push({ name: 'Referer', value: urlObj.origin + '/' });
      }

      return {
        url,
        method: 'GET',
        headers,
        cookies: cookieString,
      };
    } catch (error) {
      console.error('加载页面信息失败:', error);
      throw error;
    }
  }

  buildRawRequest(pageInfo: PageInfo): string {
    let rawRequest = `${pageInfo.method} ${pageInfo.url} HTTP/1.1\r\n`;

    pageInfo.headers.forEach(header => {
      rawRequest += `${header.name}: ${header.value}\r\n`;
    });

    rawRequest += '\r\n';

    return rawRequest;
  }

  updateContentType(headers: { name: string; value: string }[], contentType: string): { name: string; value: string }[] {
    const newHeaders = headers.filter(h => h.name.toLowerCase() !== 'content-type');
    newHeaders.push({ name: 'Content-Type', value: contentType });
    return newHeaders;
  }

  getContentTypeFromHeaders(headers: { name: string; value: string }[]): string {
    const contentTypeHeader = headers.find(h => h.name.toLowerCase() === 'content-type');
    return contentTypeHeader?.value || '';
  }
}

export const pageLoaderService = new PageLoaderService();
