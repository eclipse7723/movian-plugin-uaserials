const __UAS_PASSWORD = "297796CCB81D2551"

function UASDecrypt(cipherData) {
    const encryptedData = {
        "ciphertext": cipherData.ciphertext,
        "iv": cipherData.iv,
        "salt": cipherData.salt
    };

    // Конвертируем строки в формат, который понимает CryptoJS
    const ciphertext = CryptoJS.enc.Base64.parse(encryptedData.ciphertext);
    const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);
    const salt = CryptoJS.enc.Hex.parse(encryptedData.salt);

    // Генерируем ключ используя PBKDF2
    const keySize = 8;
    const iterations = 999;
    const key = CryptoJS.PBKDF2(__UAS_PASSWORD, salt, {
        hasher: CryptoJS.algo.SHA512,
        keySize: keySize,
        iterations: iterations
    });

    // Дешифруем данные
    const decrypted = CryptoJS.AES.decrypt({ ciphertext: ciphertext }, key, {
        iv: iv
    });

    // Конвертируем данные обратно в строку
    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);

    return plaintext;
}

function UASJsonParse(plaintext) {
    const correctedJsonString = plaintext.replace(/\\"/g, '"');
    const json = JSON.parse(correctedJsonString)
    return json;
}

function UASParsePlayerControl(HTML) {
    const pattern = /<player-control\s+([^>]+)><\/player-control>/;

    // Поиск тега в строке
    const match = HTML.match(pattern);
    const attributes = {};
    if (match) {
        const attributesString = match[1]; // Получаем строку с атрибутами
        const attrPattern = /([\w-]+)='([^']+)'/g;

        var attrMatch;

        // Извлекаем все атрибуты
        while ((attrMatch = attrPattern.exec(attributesString)) !== null) {
            const attrName = attrMatch[1];
            const attrValue = attrMatch[2];
            attributes[attrName] = attrValue;
        }
        //console.log(attributes);
    } else {
        console.error('Tag <player-control .../> not found.');
    }

    return attributes;
}

function UASJsonDecrypt(HTML) {
    const playerControlAttributes = UASParsePlayerControl(HTML);

    const cipherData = UASJsonParse(playerControlAttributes["data-tag1"]);
    const defaultData = playerControlAttributes["data-default"];

    const decryptedText = UASDecrypt(cipherData);
    const videoData = UASJsonParse(decryptedText);

    const output = {
        data: videoData,
        default: defaultData
    }
    return output;
}