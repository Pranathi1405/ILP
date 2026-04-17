import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

export const generatePdfFromHtml = async (html, materialId) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });

    const filePath = path.join(
        "uploads",
        "pdfs",
        `material_${materialId}.pdf`
    );

    await page.pdf({
        path: filePath,
        format: "A4",
        printBackground: true
    });

    await browser.close();

    return filePath; // store this in DB
};