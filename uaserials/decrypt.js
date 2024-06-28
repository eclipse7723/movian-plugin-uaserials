// Ваши зашифрованные данные
const encryptedData = {
    "ciphertext": "hIZ+lJV16Zyvpv5ooSVYMOe1kzdq8bwDBXOTaF1+lM8hPffaEbEakoGf0bHuykmebw4L2j716Wgbe7KcadeMXftLEcA2Loi2f/TEK1F6SMscCqwbjtc/IRVfWwWp9Wgj5jcRWj6EAR0nQgGX5KTRmX9yHHJBr14yWjIiz+hm/0iDQDVpm3pteogy+Uc1Dj9GOVrHTQiHaEPRJxWHJQwXR9sV2tlfWRODfrSr7IMgQik=",
    "iv": "e6254c68e76c3967fcaa842410fc636e",
    "salt": "7c205c73dcad358a6dd437931158937c5b953a1c6d650c37700bc8554ba54ae359b90a4467854ca8dba5c2a2b9866bf319b29093d6c81f126d6fb2dbcf1920c520495db09316cbdcdd0ba8557588ceb285d325e1195885ce5ea83e72cfc6f3521f2c89648dd88aa0fa6835f0e533cfa1ad9cb8e78fbc19aab2133a2060c8b0c52e5dd6bfa27c3233830f025ad1eb901329ed7249d5dad62ff8aa7a757b640e0cb32e87be7b45ba146d0adf82166eea5252a3aba2683cbde1b387b01a3b3716a3b745b29cc650bedf8c3940b40977310dda272706e9d7a5121c189cf1bf51039a73bdc685183a127e8dee30fed88ee52d24285ce9819c873a9fb6e01410ab874a"
};

// Ваш пароль для расшифровки
const password = "5b7b0d0a095c227461624e616d655c223a205c22d09fd0bbd0b5d194d1805c222c0d0a095c2275726c5c223a205c2268747470733a2f2f746f72747567612e7774662f766f642f39393038345c220d0a7d2c207b0d0a095c227461624e616d655c223a205c22d0a2d180d0b5d0b9d0bbd0b5d1805c222c0d0a095c2275726c5c223a205c2268747470733a2f2f746f72747567612e7774662f766f642f39393038335c220d0a7d5d";

// Конвертируем строки в формат, который понимает CryptoJS
const ciphertext = CryptoJS.enc.Base64.parse(encryptedData.ciphertext);
const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);
const salt = CryptoJS.enc.Hex.parse(encryptedData.salt);

// Генерируем ключ и IV используя PBKDF2
const keySize = 256;
const iterations = 1000;
const key = CryptoJS.PBKDF2(password, salt, {
    keySize: keySize / 32,
    iterations: iterations
});

// Дешифруем данные
const decrypted = CryptoJS.AES.decrypt({ ciphertext: ciphertext }, key, {
    iv: iv,
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC
});

// Конвертируем данные обратно в строку
const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
console.log("Расшифрованный текст:", plaintext);