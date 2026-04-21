const { Client } = require("@notionhq/client");
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
  notionVersion: "2026-03-11"
});
module.exports = async function handler(req, res) {
  try {
    const databaseId = process.env.NOTION_DATABASE_ID;
    const db = await notion.databases.retrieve({
      database_id: databaseId
    });
    const dataSourceId = db.data_sources?.[0]?.id;
    if (!dataSourceId) {
      return res.status(500).json({
        error: "Notion API error",
        message: "data source ID를 찾을 수 없습니다."
      });
    }
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      sorts: [
        {
          property: "날짜",
          direction: "ascending"
        }
      ],
      page_size: 100
    });
    const result = {};
    for (const page of response.results) {
      const props = page.properties || {};
      const title =
        props["이름"]?.title?.[0]?.plain_text || "일정";
      const type =
        props["유형"]?.select?.name || "show";
      const description =
        props["설명"]?.rich_text?.[0]?.plain_text || "";
      const dateProp = props["날짜"]?.date;
      if (!dateProp || !dateProp.start) continue;
      const start = new Date(dateProp.start);
      const end = dateProp.end ? new Date(dateProp.end) : new Date(dateProp.start);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = [
          d.getFullYear(),
          String(d.getMonth() + 1).padStart(2, "0"),
          String(d.getDate()).padStart(2, "0")
        ].join("-");
        if (!result[key]) result[key] = [];
        result[key].push({
          type,
          title,
          description
        });
      }
    }
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Notion API error",
      message: error.message
    });
  }
};
