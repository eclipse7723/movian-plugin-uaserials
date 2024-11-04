// палитра
const COLOR_GRAY = "7F7F7F"

// чтобы текст принял форматирование, нужно заворачивать в этот объект
var RichText = function (x) {this.str = x.toString()};
RichText.prototype.toRichString = function (x) {return this.str};

// форматирование
function getColoredFormat(text, color) {
    return '<font color="' + color + '">' + text + '</font>';
}
function formatInfo(text) {
    return getColoredFormat(text, COLOR_GRAY);
}
function formatBold(text) {
    return "<b>" + text + "</b>";
}
