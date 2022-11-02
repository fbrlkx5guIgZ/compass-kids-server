function genEnCode(length, hasNum, hasChar, hasSymbol, caseSense, lowerCase) {
    var m = "";
    if (hasNum == "0" && hasChar == "0" && hasSymbol == "0") return m;
    for (var i = length; i >= 0; i--) {
        var num = Math.floor((Math.random() * 94) + 33);
        if (
            (
                (hasNum == "0") && ((num >= 48) && (num <= 57))
            ) || (
                (hasChar == "0") && ((
                    (num >= 65) && (num <= 90)
                ) || (
                        (num >= 97) && (num <= 122)
                    ))
            ) || (
                (hasSymbol == "0") && ((
                    (num >= 33) && (num <= 47)
                ) || (
                        (num >= 58) && (num <= 64)
                    ) || (
                        (num >= 91) && (num <= 96)
                    ) || (
                        (num >= 123) && (num <= 127)
                    ))
            )
        ) {
            i++;
            continue;
        }
        m += String.fromCharCode(num);
    }
    if (caseSense == "0") {
        m = (lowerCase == "0") ? m.toUpperCase() : m.toLowerCase();
    }
    return m;
}
console.log(genEnCode(12,1,1,1))