import zipfile
import os
import sys
import json


class Params():
    plugin_desc_name = "plugin.json"
    plugin_name = "movian-plugin-uaserials"
    dependencies = [
        "jsconfig.json",  # not working for `require` my local dependencies,
        "uaserials/test.js"
    ]
    include = [
        "uaserials/crypto-js.js",
        "uaserials/decrypt.js",
    ]
    delete_temp_codefile = True
    include_version = True


def compress_to_zip(zip_filename, files, specific_names=None):
    for file in files:
        if os.path.exists(file) is False:
            raise FileNotFoundError(f'compress_to_zip - Не найден файл: {file!r}')

    if specific_names is None:
        specific_names = {}
    else:
        for filename in specific_names:
            if filename not in files:
                raise FileNotFoundError(f"compress_to_zip - Неизвестное имя {filename!r} в настройках имен specific_names")
    
    with zipfile.ZipFile(zip_filename, 'w') as zipf:
        for file in files:
            filename = specific_names.get(file, file)
            zipf.write(file, filename)
            print(f'Добавлен файл в архив: {filename!r} (source: {file})')


def makeSourceCode(output_filename, include=()):
    output_path = os.path.abspath("." + output_filename)
    with open(output_path, 'w', encoding='utf-8') as outfile:
        print(f"Создан файл с кодом плагина: {output_path!r}")
        for filename in include:
            file_path = os.path.abspath(filename)
            with open(file_path, 'r', encoding='utf-8') as infile:
                file_content = infile.read()
                outfile.write(f"/* CODE FROM {filename} #BEGIN */\n\n")
                outfile.write(file_content)
                outfile.write(f"\n\n/* CODE FROM {filename} #END */\n\n")
            print(f"  > Код из файла {filename!r} импортирован")

    return output_path


def readDescFile():
    desc_name = Params.plugin_desc_name
    if os.path.exists(desc_name) is False:
        raise FileNotFoundError(f"readDescFile - Не найден файл с настройками плагина {desc_name!r}")

    with open(desc_name, "r") as f:
        plugin_desc = json.load(f)

    return plugin_desc


def build():
    def __enum_list_of_strings(list_of_strings):
        for string in list_of_strings:
            print(f"    - {string}")

    plugin_desc = readDescFile()

    source_code_list = Params.include + [plugin_desc["file"]]   # code dependencies first, then main file
    print(f"* Источники исходного кода:")
    __enum_list_of_strings(source_code_list)
    source_code_path = makeSourceCode("plugin.js", source_code_list)

    files = [Params.plugin_desc_name, plugin_desc["icon"], source_code_path]
    if len(Params.dependencies) != 0:
        files += Params.dependencies
        print(f"* Источники дополнительных файлов:")
        __enum_list_of_strings(Params.dependencies)

    try:
        zip_filename = Params.plugin_name
        if Params.include_version is True:
            zip_filename += f"-{plugin_desc['version']}"
        zip_filename += ".zip"

        specific_names = {source_code_path: plugin_desc["file"]}
        compress_to_zip(zip_filename, files, specific_names=specific_names)

    except FileNotFoundError as e:
        print(e)
        print("build - Устраните ошибки и попробуйте снова...")
        exit(-1)

    if Params.delete_temp_codefile is True and os.path.exists(source_code_path) is True:
        print(f"Временный файл {source_code_path!r} удалён")
        os.remove(source_code_path)

    print(f'\nПлагин создан: {os.path.abspath(zip_filename)} - версия {plugin_desc["version"]}')
    print(f'Переместите его на флешку, подключите флешку к PS3, откройте в Movian эту флешку, найдите zip файл и установите плагин!')

    return zip_filename

if __name__ == "__main__":
    build()