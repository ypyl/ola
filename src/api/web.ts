import {
  ArticleData,
  extractFromHtml,
  setSanitizeHtmlOptions,
  getSanitizeHtmlOptions,
} from "@extractus/article-extractor";
import { os } from "@neutralinojs/lib";

const options = getSanitizeHtmlOptions();
setSanitizeHtmlOptions({ ...options, parseStyleAttributes: false });

export async function fetchAndExtractArticle(url: string): Promise<ArticleData | null> {
  try {
    let cmd = await os.execCommand(NL_CWD + `/curl/curl ${url}`);
    if (cmd.exitCode > 0) {
      throw new Error(cmd.stdErr);
    }
    const html = cmd.stdOut;
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
