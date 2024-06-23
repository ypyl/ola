import { ArticleData, extractFromHtml } from '@extractus/article-extractor'
import { NeutralinoCurl } from "./curl";

class EnhancedNeutralinoCurl extends NeutralinoCurl {
  constructor(opt = {}) {
    super(opt);
  }

  async fetchAndExtractText(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let aggregatedData = '';

      const handleCurlData = (e: any) => {
        // Aggregate data from curlData events
        aggregatedData += e.detail;
      };

      const handleCurlEnd = (e: any) => {
        // Remove the event listeners after receiving the end event
        document.removeEventListener("curlData", handleCurlData);
        document.removeEventListener("curlEnd", handleCurlEnd);

        // Resolve the promise with the aggregated data
        resolve(aggregatedData);
      };

      // Add the event listeners
      document.addEventListener("curlData", handleCurlData);
      document.addEventListener("curlEnd", handleCurlEnd);

      // Perform the get request
      this.get(url).catch((error) => {
        // Remove the event listeners in case of an error
        document.removeEventListener("curlData", handleCurlData);
        document.removeEventListener("curlEnd", handleCurlEnd);
        reject(error);
      });
    });
  }
}

const CURL = new EnhancedNeutralinoCurl();

export async function fetchAndExtractArticle(url: string): Promise<ArticleData | null> {
  try {
    const response = await CURL.fetchAndExtractText(url);
    const html = response;
    const article = await extractFromHtml(html, url);
    return article;
  } catch (error) {
    console.error("Error fetching the URL:", error);
    return null;
  }
}

export function isValidUrl(string: string): boolean {
  const urlPattern = new RegExp(
    "^(https?:\\/\\/)?" + // protocol
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|" + // domain name
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR ip (v4) address
      "(\\:\\d+)?" + // port
      "(\\/[-a-z\\d%_.~+]*)*" + // path
      "(\\?[;&a-z\\d%_.~+=-]*)?" + // query string
      "(\\#[-a-z\\d_]*)?$",
    "i" // fragment locator
  );
  return !!urlPattern.test(string);
}
