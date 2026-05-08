# Pandoc binary

Цей каталог не містить pandoc у git (бінарник ~190 МБ).

Щоб згенерувати DOCX чи PPTX, скачай pandoc для свого OS:

```bash
# macOS arm64
cd scripts/bin
curl -sL -o pandoc.zip 'https://github.com/jgm/pandoc/releases/download/3.9.0.2/pandoc-3.9.0.2-arm64-macOS.zip'
unzip -q pandoc.zip 'pandoc-*/bin/pandoc' && mv pandoc-*/bin/pandoc ./pandoc
rm -rf pandoc-* pandoc.zip
chmod +x pandoc
```

Для іншого OS — інша назва архіву на https://github.com/jgm/pandoc/releases.
