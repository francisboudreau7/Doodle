var decouperEnLignes = function (contenu) {
    var lignes = contenu.split("\n");
    if (lignes[lignes.length-1] == "") {
        lignes.pop();
    }
    return lignes;
};

var lireCSV = function (path) {
    var lignes = decouperEnLignes(readFile(path));
    var resultat = [];
    for (var i=0; i<lignes.length; i++) {
        resultat.push(lignes[i].split(","));
    }
    return resultat;
};

var ecrireCSV = function (path, matrice) {
    var contenu = "";
    for (var i=0; i<matrice.length; i++) {
        contenu += matrice[i].join(",") + "\n";
    }
    writeFile(path, contenu);
};

var fs = require("fs");

var readFile = function (path) {
    return fs.readFileSync(path).toString();
};

var writeFile = function (path, texte) {
    fs.writeFileSync(path, texte);
};