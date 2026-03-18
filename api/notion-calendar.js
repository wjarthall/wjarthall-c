module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const notionRes = await fetch(
      `https://api.notion.com/v1/data_sources/${process.env.NOTION_DATA_SOURCE_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
          "Notion-Version": "2025-09-03",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page_size: 100
        })
      }
    );

    const text = await notionRes.text();

    if (!notionRes.ok) {
      return res.status(500).json({
        error: "Notion API error",
        status: notionRes.status,
        body: text
      });
    }

    const data = JSON.parse(text);

    const typeMap = {
      공연: "show",
      휴무: "off",
      대관: "rental",
      마감: "closed"
    };

    const scheduleStore = {};

    for (const page of data.results || []) {
      const props = page.properties || {};

      const title =
        props["일정명"]?.title?.[0]?.plain_text?.trim() ||
        props["Title"]?.title?.[0]?.plain_text?.trim() ||
        "일정";

      const date =
        props["날짜"]?.date?.start ||
        props["Date"]?.date?.start ||
        null;

      const notionType =
        props["구분"]?.select?.name ||
        props["Select"]?.select?.name ||
        "공연";

      if (!date) continue;

      const key = date.slice(0, 10);

      if (!scheduleStore[key]) scheduleStore[key] = [];
      scheduleStore[key].push({
        type: typeMap[notionType] || "show",
        title
      });
    }

    return res.status(200).json(scheduleStore);
  } catch (error) {
    return res.status(500).json({
      error: String(error)
    });
  }
};
