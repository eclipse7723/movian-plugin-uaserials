import shutil
import os

from build import Params, build


ENV_RPC3_PLUGINS_PATH = "RPC3_PLUGINS_PATH"


def load_env_file(filepath: str) -> None:
    """ loads .env file and set environment variables """

    if os.path.exists(filepath) is False:
        raise FileNotFoundError(f"Не найден env файл {filepath!r}")
    with open(filepath) as f:
        for line in f:
            if line.strip() and line.startswith('#') is False:
                key, value = line.strip().split('=', 1)
                os.environ[key] = value


def build_and_update(rpc_path: str) -> None:
    """ builds plugin and copy it to `rpc_path` """

    if os.path.exists(rpc_path) is False:
        raise FileNotFoundError(f"Не найден путь с плагинами RPC3 или это не папка: {rpc_path}.\n"
              f"Проверь `.env` файл, там должна быть строка `{ENV_RPC3_PLUGINS_PATH}`.")

    zip_filename = build()
    if zip_filename is None:
        print(f"Error: во время билдинга что-то сломалось...")
        exit(-1)

    destination_path = os.path.join(rpc_path, zip_filename)
    shutil.copyfile(zip_filename, destination_path)
    print(f"\nНовый билд {zip_filename!r} был скопирован в папку {destination_path!r}")


def main() -> None:
    """ creates new dev build and replaces old one in the RPC3 app if it exists """

    Params.include_version = False
    Params.plugin_name += "-dev"
    load_env_file(".env")

    rpc_path = os.getenv(ENV_RPC3_PLUGINS_PATH)
    print(f"ENV_RPC3_PLUGINS_PATH={rpc_path}\n")
    if rpc_path is None:
        raise ValueError(f"Проверь `.env` файл, там должна быть строка `{ENV_RPC3_PLUGINS_PATH}`.")

    build_and_update(rpc_path)


if __name__ == "__main__":
    main()
