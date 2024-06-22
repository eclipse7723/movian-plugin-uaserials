import zipfile
import os
import sys
import json


plugin_desc_name = "plugin.json"


def compress_to_zip(zip_filename, files):
    for file in files:
        if os.path.exists(file) is False:
            raise FileNotFoundError(f'Не найден файл: {file}')
    
    with zipfile.ZipFile(zip_filename, 'w') as zipf:
        for file in files:
            zipf.write(file, os.path.basename(file))
            print(f'Добавлен файл в архив: {file}')


def build():
    if os.path.exists(plugin_desc_name) is False:
        raise FileNotFoundError("Не найден файл с настройками плагина "+plugin_desc_name)

    with open(plugin_desc_name, "r") as f:
        plugin_desc = json.load(f)

    files = [plugin_desc_name, plugin_desc["icon"], plugin_desc["file"]]

    try:
        zip_filename = f"movian-plugin-uaserials-{plugin_desc['version']}.zip"
        compress_to_zip(zip_filename, files)
    
        print(f'Плагин создан: {os.path.abspath(zip_filename)} - версия {plugin_desc["version"]}')
        print(f'Переместите его на флешку, подключите флешку к PS3, откройте в Movian эту флешку, найдите zip файл и установите плагин!')
    
    except FileNotFoundError as e:
        print(e)
        print("Устраните ошибки и попробуйте снова...")
        exit(-1)

if __name__ == "__main__":
    build()