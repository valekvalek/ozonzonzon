# ozonzonzon

Headless-браузер (Playwright + stealth-плагин): страница открывается как в обычном браузере, затем забираются нужные данные.

Компромиссы: надёжнее, чем прямые HTTP-запросы, но медленнее и дороже по ресурсам; сильная антибот-защита всё равно может блокировать.

## Запуск

```bash
npm install
npx playwright install chromium   # либо CHROMIUM_PATH=/путь/к/chromium
npm run scrape -- https://example.com --selector "h1"
```

Флаги: `--selector "css"` — забрать текст элементов; `--headful` — с окном браузера.
Результат: `output/result.json`, `output/page.png`.

Соблюдайте условия использования сайта и robots.txt.
