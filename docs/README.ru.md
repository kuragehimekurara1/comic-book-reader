<p align="right">  
  <a href="#downloads"><img src="https://user-images.githubusercontent.com/8535921/189104931-527ab8bc-8757-4e04-8150-5207d2077bb8.png" title="linux"></a>
  <a href="#downloads"><img src="https://user-images.githubusercontent.com/8535921/189104940-ade062d9-d2e0-4e08-83a4-f34cdb457025.png" title="windows"></a>
  <a href="#license"><img src="https://user-images.githubusercontent.com/8535921/189119543-b1f7cc20-bd0e-44e7-811a-c23b0ccdf767.png" title="open source"></a>
  <a href="http://www.binarynonsense.com/"><img src="https://user-images.githubusercontent.com/8535921/189104953-7ac2d4d1-7d36-483b-8cc9-3568d1cbf6e5.png" title="my website"></a>
  <a href="https://twitter.com/binarynonsense"><img src="https://user-images.githubusercontent.com/8535921/189104963-ae74d98e-ddb3-4068-8958-7028ecae2966.png" title="my twitter"></a>
</p>

# ACBR - Comic Book Reader

Программа для чтения и конвертирования комиксов с расширениями файлов cbz, cbr, cb7, epub и pdf.

![git_banner](https://user-images.githubusercontent.com/8535921/189077872-0b8dab41-9c0f-4487-9462-7cd2ba49e35a.png)

<p align="center">
  <a href="./README.en.md">English</a> |
  <a href="./README.es.md">Español</a> |
  <span>Русский</span> | 
  <a href="./README.de.md">Deutsch</a>
</p>

## Содержание:

- [Особенности](#особенности)
- [Управление](#управление)
- [Скачать](#скачать)
- [Вклад](#вклад)
- [Лицензия](#лицензия)

## Особенности:

- Совместим с Windows и GNU/Linux.
- Совместимые расширения файлов:

  - Комиксы:
    - .cbz
    - .cbr
    - .cb7
    - .pdf
    - .epub
  - Изображения:
    - .jpg
    - .png
    - .webp
    - .avif
  - Электронные книги:
    - .pdf
    - .epub

  Включая защищенные паролем файлы pdf, cbz (шифрование AES не поддерживается), cb7 и cbr.

- Оконный (простой пользовательский интерфейс) и полноэкранный (без пользовательского интерфейса) режимы.
- "Подгонка по ширине", "подгонка по высоте" и настраиваемые виды страниц "масштабирование по высоте".
- Поворот страницы.
- Интерфейс доступен на:
  - Английском
  - Испанском
  - Русском
  - Немецком
- Автоматически восстанавливает последнюю открытую книгу и страницу предыдущего сеанса и запоминает позиции страниц последних книг.
- Переносной режим (путем создания файла с именем portable.txt в той же папке, что и исполняемый файл).
- Встроенный аудиоплеер:
  - поддерживаются расширения файлов .mp3, .ogg, .wav, .m3u и .m3u8
  - можно экспортировать плейлист в файл .m3u
- Инструменты:
  - Конвертация/Изменение размера:
    - комиксов (cbr, cbz, cb7, pdf или epub в cbz, cb7, pdf или epub).
    - изображений (jpg, png, avif или webp).
  - Создание:
    - комиксов (cbz, cb7, pdf или epub) из списка изображений.
    - изображение QR-кода из текста.
  - Извлечение:
    - страниц комиксов (в jpg, png, avif или webp).
    - текста (OCR) со страницы комикса или изображения.
    - текста QR-кода со страницы комикса или с изображения.
    - цветовой палитры со страницы комикса или с изображения.
      - можно экспортировать в файл палитры .gpl или .aco.
  - Другое:
    - поиск и открытые книг/комиксов из:
      - Digital Comics Museum.
      - Internet Archive Books.
      - Project Gutenberg.
      - xkcd Webcomics.
    - поиск и открытие аудиокниг из:
      - Librivox AudioBooks.
    - поиск словарных терминов из:
      - Викисловаря.

## Управление:

- Панель инструментов:
  - кнопки: 'открыть файл', 'предыдущая страница', 'следующая страница', 'подогнать по ширине', 'подогнать по высоте', 'вращать против часовой стрелки', 'вращать по часовой стрелке' и 'переключить на весь экран'.
  - ползунок: используйте его для быстрого перехода к любой странице книги.
- Горячие клавиши:
  - 'стрелка вправо' или 'page down' - перейти на следующую страницу.
  - 'стрелка вправо' или 'page up' - перейти на предыдущую страницу.
  - 'стрелка вверх' - прокрутить страницу вверх, 'стрелка вниз' - прокрутить страницу вниз.
  - 'wasd' - прокрутка страницы по вертикали и горизонтали.
  - 'f11' - переключить на весь экран.
  - 'ctrl+O' - выбрать файл для открытия.
  - 'ctrl++' и 'ctrl+-' - увеличение или уменьшение масштаба просмотра. 'ctrl+0' - сбросить масштаб.
- Мышь:
  - 'прокрутка колеса' - прокрутка страницы вверх и вниз.
  - 'щелчёк лкм' - открывает следующую страницу, если щёлкнуть по правой стороне просмотра, и предыдущую страницу, если щёлкнуть по левой стороне.
  - 'щелчёк пкм' - открывает контекстное меню с некоторыми основными параметрами навигации.
  - 'ctrl+прокрутка колеса' - увеличить или уменьшить масштаб изображения.

## Скачать:

- [Windows](https://github.com/binarynonsense/comic-book-reader/releases/latest/download/ACBR_Windows.zip)
- [Windows (Самораспаковка)](https://github.com/binarynonsense/comic-book-reader/releases/latest/download/ACBR_Windows_SelfExtracting.exe)
- [Linux](https://github.com/binarynonsense/comic-book-reader/releases/latest/download/ACBR_Linux.zip)
- [Linux (AppImage)](https://github.com/binarynonsense/comic-book-reader/releases/latest/download/ACBR_Linux_AppImage.zip)

## Участники вклада:

- Русская локализация от [vanja-san](https://github.com/vanja-san)
- Немецкая локализация от [Timo Heidutzek (trzyglow)](https://github.com/trzyglow)

Информация о том, как внести свой вклад в проект, содержится в файле [CONTRIBUTING.md](../CONTRIBUTING.md).

## Лицензия:

Код ACBR выпущен в соответствии с [лицензией](../LICENSE) BSD 2-Clause. Чтобы проверить лицензии модулей узла и других библиотек, используемых в проекте, перейдите в папку [лицензий](../licenses/).
