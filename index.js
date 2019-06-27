// Travail de Francis Boudreau et Laura Begin


'use strict';
// Prend un texte et le retourne sur plusieurs lignes a chaque saut de ligne \n
// Code tire des notes de cours (chap. 10, p. 44)


var decouperEnLignes = function (contenu) {
    var lignes = contenu.split("\n");
    if (lignes[lignes.length - 1] == "") {
        lignes.pop();
    }
    return lignes;
};

// Prend un fichier .CSV et retourne son contenu dans un tableau
// Code tire des notes de cours (chap. 10, p. 51)

var lireCSV = function (path) {
    var lignes = decouperEnLignes(readFile(path));
    var resultat = [];
    for (var i = 0; i < lignes.length; i++) {
        resultat.push(lignes[i].split(","));
    }
    return resultat;
};

// Cree un fichier .CSV a partir d'une matrice
// Code tire des notes de cours (chap. 10, p. 53)

var ecrireCSV = function (path, matrice) {
    var contenu = "";
    for (var i = 0; i < matrice.length; i++) {
        contenu += matrice[i].join(",") + "\n";
    }
    writeFile(path, contenu);
};

var http = require("http");
var fs = require('fs');
var urlParse = require('url').parse;
var pathParse = require('path').parse;
var querystring = require('querystring');

var port = 1337;
var hostUrl = 'http://localhost:' + port + '/';
var defaultPage = '/index.html';

var mimes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
};

// --- Helpers ---
var readFile = function (path) {
    return fs.readFileSync(path).toString('utf8');
};

var writeFile = function (path, texte) {
    fs.writeFileSync(path, texte);
};

// --- Server handler ---
var redirect = function (reponse, path, query) {
    var newLocation = path + (query == null ? '' : '?' + query);
    reponse.writeHeader(302, {
        'Location': newLocation
    });
    reponse.end('302 page deplace');
};

var getDocument = function (url) {
    var pathname = url.pathname;
    var parsedPath = pathParse(url.pathname);
    var result = {
        data: null,
        status: 200,
        type: null
    };

    if (parsedPath.ext in mimes) {
        result.type = mimes[parsedPath.ext];
    } else {
        result.type = 'text/plain';
    }

    try {
        result.data = readFile('./public' + pathname);
        console.log('[' + new Date().toLocaleString('iso') + "] GET " + url.path);
    } catch (e) {
        // File not found.
        console.log('[' + new Date().toLocaleString('iso') + "] GET " +
            url.path + ' not found');
        result.data = readFile('template/error404.html');
        result.type = 'text/html';
        result.status = 404;
    }

    return result;
};
var sendPage = function (reponse, page) {
    reponse.writeHeader(page.status, {
        'Content-Type': page.type
    });
    reponse.end(page.data);
};

var indexQuery = function (query) {

    var resultat = {
        exists: false,
        id: null
    };

    if (query !== null) {

        query = querystring.parse(query);
        if ('id' in query && 'titre' in query &&
            query.id.length > 0 && query.titre.length > 0) {

            resultat.exists = creerSondage(
                query.titre, query.id,
                query.dateDebut, query.dateFin,
                query.heureDebut, query.heureFin);
        }

        if (resultat.exists) {
            resultat.id = query.id;
        }
    }

    return resultat;
};

var calQuery = function (id, query) {
    if (query !== null) {
        query = querystring.parse(query);
        // query = { nom: ..., disponibilites: ... }
        ajouterParticipant(id, query.nom, query.disponibilites);
        return true;
    }
    return false;
};

var getIndex = function (replacements) {
    return {
        status: 200,
        data: readFile('template/index.html'),
        type: 'text/html'
    };
};


// --- À completer ---

var mois = [
    'Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin',
    'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Dec'
];

var MILLIS_PAR_JOUR = (24 * 60 * 60 * 1000);

// Prend les dates de debut et de fin du sondage et les retourne en
// millisecondes dans un enregistrement

var dateMs = function (dateDebut, dateFin) {
    var dateDebutTab = dateDebut.split("-");
    var dateFinTab = dateFin.split("-");
    var dateDebut = new Date(+dateDebutTab[0], 
                  +dateDebutTab[1] - 1, +dateDebutTab[2]);
    var dateFin = new Date(+dateFinTab[0], +dateFinTab[1] - 1, +dateFinTab[2]);
    var dateDebutMs = dateDebut.getTime();
    var dateFinMs = dateFin.getTime();
    return ({
        debut: dateDebutMs,
        fin: dateFinMs
    })

};


// Prend un code HTML deja converti en chaine, remplace une balise par le 
// contenu approprie et retourne la chaine HTML.

var modifPageHTML = function (chaineHTML, balise, string) {
    chaineHTML = chaineHTML.split(balise);
    for (var i = 0; i < chaineHTML.length - 1; i++) {
        chaineHTML[i] = chaineHTML[i] + string;
    }
    chaineHTML = chaineHTML.join("")
    return chaineHTML
};

// Trouve le sondage demande avec l'ID de sondage correspondant parmi le
// fichier .CSV contenenant tous les sondages. 
// Retourne un enregistrement du sondage.

var obtenirSondage = function (sondageId) {
    var sondagesEnMemoire = lireCSV("./sondage.CSV");


    for (var i = 0; i < sondagesEnMemoire.length; i++) {
        if (sondagesEnMemoire[i][1] == sondageId)
            var sondageDemande = sondagesEnMemoire[i];
    }
    var sondage = {
        titre: sondageDemande[0],
        id: sondageDemande[1],
        dateDebut: sondageDemande[2],
        dateFin: sondageDemande[3],
        heureDebut: sondageDemande[4],
        heureFin: sondageDemande[5]
    };
    return sondage
}
// --- Reponse au sondage ---

// Retourne le texte HTML à afficher à l'utilisateur pour repondre au
// sondage demande.
// Retourne false si le calendrier demande n'existe pas.

var getCalendar = function (sondageId) {
    var sondage = obtenirSondage(sondageId);
    var date = dateMs(sondage.dateDebut, sondage.dateFin);
    var nbJours = ((date.fin - date.debut) / MILLIS_PAR_JOUR) + 1;


    var nbHeures = sondage.heureFin - sondage.heureDebut + 1;

    var table = tabSondage(date, nbJours, nbHeures, sondage)

    var chaineHTML = readFile("./template/calendar.html");
    var urlString = "http://localhost:1337/"
    chaineHTML = modifPageHTML(chaineHTML, "{{titre}}", sondage.titre);
    chaineHTML = modifPageHTML(chaineHTML, "{{url}}", urlString + sondage.id);
    chaineHTML = modifPageHTML(chaineHTML, "{{table}}", table);

    return (chaineHTML);
    //return 'Calendrier <b>' + sondageId + sondageDemande.titre + '</b> (TODO)';
    //return readFile("./template/calendar.html");
};

// Retourne le texte HTML à afficher à l'utilisateur pour voir les
// resultats du sondage demande
//
// Doit retourner false si le calendrier demande n'existe pas
var getResults = function (sondageId) {
    var sondage = obtenirSondage(sondageId);
    var resultats = obtenirResultats(sondageId);
    resultats = attribuerCouleur(resultats);
    var tabRef = TabResultatsRef(resultats, sondage);
    var tabMinMax = creertabMinMax(tabRef);
    var chaineHTML = readFile("./template/results.html");
    var urlString = "http://localhost:1337/"
    chaineHTML = modifPageHTML(chaineHTML, "{{titre}}", sondage.titre);
    chaineHTML = modifPageHTML(chaineHTML, "{{url}}", urlString + sondage.id);
    chaineHTML = modifPageHTML(chaineHTML, "{{legende}}", creerLegende(resultats));
    chaineHTML = modifPageHTML(chaineHTML, 
                "{{table}}", creerTabResultats(tabRef, tabMinMax));
    return chaineHTML;
};

// Prend le tableau des resultats demandes et retourne un tableau de reference
// contenant les informations du tableau HTML allant dans les balises <th>
// (jours et heures).

var TabResultatsRef = function (resultats, sondage) {
    var date = dateMs(sondage.dateDebut, sondage.dateFin);
    var nbJours = ((date.fin - date.debut) / MILLIS_PAR_JOUR) + 1;
    var nbHeures = sondage.heureFin - sondage.heureDebut + 1;

    var nbHeures = sondage.heureFin - sondage.heureDebut + 1;
    var tabRef = tabSondageRef(sondage, date, nbHeures, nbJours);
    for (var i = 0; i < resultats.length; i++) {
        var dispo = resultats[i][1];
        
        for (var j = 1; j < tabRef.length; j++) {
            for (var k = 1; k < tabRef[j].length; k++) {
                var char = dispo.charAt((j * k + (j - 1) * (nbJours - k)) - 1);
                if (char == "1") {
                    tabRef[j][k] += resultats[i][2];
                } else {
                    tabRef[j][k] += "";
                }
            }
        }
    }
    return tabRef
};
// Retourne un tableau des valeurs minimales et maximales des resultats du 
// sondage (le moins et le plus de disponibilites choisies parmi les cases
// horaires). 
// 1 = max; -1 = min; 0 = autre.
var creertabMinMax = function (tabRef) {
    var max = 0;
    var min = 1000;
    for (var i = 1; i < tabRef.length; i++) {
        for (var j = 1; j < tabRef[1].length; j++) {
            if (tabRef[i][j].length > max) {
                max = tabRef[i][j].length;
            }
            if (tabRef[i][j].length < min) {
                min = tabRef[i][j].length;
            }
        }
    }
    var tabMinMax = tabRef.map(function (rangee, i) {
        return tabRef[i].map(function (element, j) {
            if (i > 0 && j > 0) {
                if (element.length == max) {
                    return 1
                } else if (element.length == min) {
                    return -1
                } else {
                    return 0
                };
            } else return 0


        });
    });
    return tabMinMax
};
// Attribue une couleur a chaque repondant du sondage.

var attribuerCouleur = function (resultats) {
    for (var i = 0; i < resultats.length; i++) {
        resultats[i].push(genColor(i, resultats.length));

    }
    return resultats
};
// Retourne le texte HTML qui affiche la legende des couleurs sous le tableau
// de resultats.
var creerLegende = function (resultats) {
    var chaineLegende = "";
    for (var i = 0; i < resultats.length; i++) {
        chaineLegende += balise("li", creerAttribut("style", 
        "background-color:" + resultats[i][2]), resultats[i][0]);
    }

    return chaineLegende
};


// Cree un sondage à partir des informations entrees
//
// Doit retourner false si les informations ne sont pas valides, ou
// true si le sondage a ete cree correctement.

// Retourne une balise HTML avec son nom, son attribut et son contenu.
var balise = function (nom, attribut, contenu) {
    return "<" + nom + " " + attribut + ">" + contenu + "</" + nom + ">";
};
// Retourne un attribut HTML avec differentes proprietes.

var creerAttribut = function (attribut, propriete) {
    return attribut + "=\"" + propriete + "\"";
};

// Retourne le tableau de resultats en texte HTML.

var creerTabResultats = function (tabRef, tabMinMax) {
    var nom = "";
    var attribut = "";
    var contenu = "";



    return balise("table", "", tabRef.map(function (rangee, i) {
        return balise("tr", "", tabRef[i].map(function (element, j) {
            if (i == 0 || j == 0) {
                nom = "th";
                contenu = element;
                if (i == 0 && j != 0) {

                    attribut = "";

                } else if (i == 0 && j == 0) {
                    attribut = "";

                } else {
                    attribut = "";
                    contenu = element;

                }
            } else {
                nom = "td";
                if (tabMinMax[i][j] == 1) {
                    attribut = creerAttribut("class", "max");
                } else if (tabMinMax[i][j] == -1) {
                    attribut = creerAttribut("class", "min");
                    contenu = "";
                } else {
                    attribut = ""
                };
                if (element.includes("#") && element.length != 0) {
                    contenu = "";
                    for (var k = 0; k < element.length / 7; k++) {
                        var couleur = element.slice(k * 7, k * 7 + 7);
                        contenu += balise("span", 
                        creerAttribut("style", "background-color:" + 
                        couleur + "; color:" + couleur), ".");
                    }
                }

            }
            return balise(nom, attribut, contenu);
        }).join(""));
    }).join(""));
};




// Prend le sondage sous forme d'enregistrement et retourne un tableau de 
// reference contenant les informations du tableau HTML allant dans les balises
// <th> (jours et heures). Les balises <td> seront associes aux chaines vides.


var tabSondageRef = function (sondage, date, nbHeures, nbJours) {

    var jour = new Date(date.debut);
    var heureDebut = sondage.heureDebut;

    var tabSondageRef = Array(nbHeures);
    for (var i = 0; i <= nbHeures; i++) {
        tabSondageRef[i] = Array(nbJours);
    }

    // Remplit le tableau avec les jours et les heures du sondage


    for (var i = 0; i <= nbHeures; i++) {
        for (var j = 0; j <= nbJours; j++) {
            if (i == 0 || j == 0) {
                if (i == 0 && j != 0) {
                    tabSondageRef[i][j] = jour.getDate() 
                    + " " + mois[jour.getMonth()];
                    jour = new Date(jour.getTime() + MILLIS_PAR_JOUR);

                } else if (i != 0 && j == 0) {
                    tabSondageRef[i][j] = heureDebut + "h";
                    heureDebut++;
                }
            } else {
                tabSondageRef[0][0] = "";
                tabSondageRef[i][j] = "";

            }
        }

    }

    return tabSondageRef;

};
// Retourne le tableau de sondage en texte HTML.

var tabSondage = function (date, nbJours, nbHeures, sondage) {
    var nom = "";
    var attribut = "";
    // Cree le texte HTML selon le tableau de reference.

    var tabRef = tabSondageRef(sondage, date, nbHeures, nbJours);
    return balise("table", creerAttribut("id", "calendrier") +
        creerAttribut("onmousedown", "onClick(event)") +
        creerAttribut("onmouseover", "onMove(event)") +
        creerAttribut("data-nbjours", nbJours) +
        creerAttribut("data-nbheures", nbHeures), tabRef.map(function (rangee, i){
            return balise("tr", "", rangee.map(function (element, j) {
                if (i == 0 || j == 0) {
                    nom = "th";
                    if (i == 0 && j != 0) {

                        attribut = "";

                    } else if (i == 0 && j == 0) {
                        attribut = "";

                    } else {
                        attribut = "";

                    }
                } else {
                    nom = "td";
                    attribut = creerAttribut("id", (j - 1) + "-" + (i - 1));

                }
                return balise(nom, attribut, element);
            }).join(""));
        }).join(""));
};

// --- Resultats ---

// Trouve les resultats demandes avec l'ID de sondage correspondant parmi le
// fichier .CSV contenant tous les sondages.
// Retourne un les resultats dans un tableau.

var obtenirResultats = function (sondageId) {
    var resultatsEnMemoire = lireCSV("./dispo.CSV");

    var resultatsDemandes = [];

    for (var i = 0; i < resultatsEnMemoire.length; i++) {
        if (resultatsEnMemoire[i][0] == sondageId) {
            resultatsDemandes.push(resultatsEnMemoire[i]);
        }
    }

    var resultats = []
    for (var i = 0; i < resultatsDemandes.length; i++) {
        resultats.push(resultatsDemandes[i].slice(1));
    }

    return resultats;
}


// --- Sondage ---

// Cree un sondage à partir des informations entrees.
// Retourne false si les informations ne sont pas valides, ou
// true si le sondage a ete cree correctement.


var creerSondage = function (titre, id, dateDebut, dateFin, heureDebut, heureFin) {
    // Verife si le ID contient seulement des chiffres, des lettres majuscules
    // ou minuscules, ou des tirets -


    for (var i = 0; i < id.length; i++) {
        var ascii = id.charCodeAt(i);
        if ((ascii >= 97 && ascii <= 122)) {} 
        else if ((ascii >= 65 && ascii <= 90)) {} 
        else if ((ascii >= 48 && ascii <= 57)) {} 
        else if ((ascii != 45)) {
            return false;
        }
    }
    //    min, maj, chiffres, tirets


    if (dateDebut > dateFin) {
        return false;
    }
    if (+heureDebut.split("h")[0] > +heureFin.split("h")[0]) {
        return false;
    }

    var date = dateMs(dateDebut, dateFin);
    var nbJours = ((date.fin - date.debut) / MILLIS_PAR_JOUR);
    if (nbJours > 30) {
        return false
    }



    var sondage = [
        titre,
        id,
        dateDebut,
        dateFin,
        heureDebut,
        heureFin
    ]

    var temp = lireCSV("./sondage.csv");
    temp.push(sondage)
    ecrireCSV("./sondage.csv", temp);

    return true;
};

// Ajoute un participant et ses disponibilites aux resultats d'un
// sondage. Les disponibilites sont envoyees au format textuel
// fourni par la fonction compacterDisponibilites() de public/calendar.js
// Cette fonction ne retourne rien.

var ajouterParticipant = function (sondageId, nom, disponibilites) {

    var participant = [sondageId, nom, disponibilites];
    var temp = lireCSV("./dispo.csv");
    temp.push(participant);
    ecrireCSV("./dispo.csv", temp);


};

// Genère la `i`ème couleur pour un nombre total de repondants au sondage.
// Retourne la couleur au format hexadecimal HTML.


var genColor = function (i, nbTotal) {
    var teinte = (i / nbTotal) * 360;
    var h = teinte / 60;
    var c = 0.7;
    var x = c * (1 - Math.abs(h % 2 - 1));
    var couleur;
    switch (Math.floor(h)) {
        case 0:
            couleur = [c, x, 0]
            break;
        case 1:
            couleur = [x, c, 0]
            break;
        case 2:
            couleur = [0, c, x]
            break;
        case 3:
            couleur = [0, x, c]
            break;
        case 4:
            couleur = [x, 0, x]
            break;
        case 5:
            couleur = [c, 0, x]
            break;
        default:
            couleur = [0, 0, 0]
            break
    }
    couleur = couleur.map(function (element) {
        return (Math.floor(element * 255)).toString(16);
    });
    couleur = couleur.map(function (element) {
        if (element.length == 1) {
            return "0" + element;
        } else return element;
    });
    return "#" + couleur.join("");
};



/*
 * Creation du serveur HTTP
 * Note : pas besoin de toucher au code ici (sauf peut-être si vous
 * faites les bonus)
 */
http.createServer(function (requete, reponse) {
    var url = urlParse(requete.url);

    // Redirect to index.html
    if (url.pathname == '/') {
        redirect(reponse, defaultPage, url.query);
        return;
    }

    var doc;

    if (url.pathname == defaultPage) {
        var res = indexQuery(url.query);

        if (res.exists) {
            redirect(reponse, res.id);
            return;
        } else {
            doc = getIndex(res.data);
        }
    } else {
        var parsedPath = pathParse(url.pathname);

        if (parsedPath.ext.length == 0) {
            var id;

            if (parsedPath.dir == '/') {
                id = parsedPath.base;

                if (calQuery(id, url.query)) {
                    redirect(reponse, '/' + id + '/results')
                    return;
                }

                var data = getCalendar(id);

                if (data === false) {
                    redirect(reponse, '/error404.html');
                    return;
                }

                doc = {
                    status: 200,
                    data: data,
                    type: 'text/html'
                };
            } else {
                if (parsedPath.base == 'results') {
                    id = parsedPath.dir.slice(1);
                    var data = getResults(id);

                    if (data === false) {
                        redirect(reponse, '/error404.html');
                        return;
                    }

                    doc = {
                        status: 200,
                        data: data,
                        type: 'text/html'
                    };
                } else {
                    redirect(reponse, '/error404.html');
                    return;
                }
            }
        } else {
            doc = getDocument(url);
        }
    }

    sendPage(reponse, doc);

}).listen(port);

// --- Tests ---

var testIndex = function () {

    var assert = require("assert");

    // Test de dateMs

    assert(dateMs("2018-31-01", "2019-01-01") == {
        debut: 1517356800000,
        fin: 1546300800000
    } + "");
    assert(dateMs("1970-01-01", new Date() == {
        debut: 0,
        fin: new Date()
    } + ""));
    assert(dateMs("", "") == {
        debut: NaN,
        fin: NaN
    } + "");

    // Test de modifPageHTML

    assert(modifPageHTML("<title>{{titre}}</title>", "{{titre}}", "test") ==
        "<title>test</title>");
    assert(modifPageHTML("<title></title>", "{{titre}}", "test") ==
        "<title></title>");
    assert(modifPageHTML("<title>{{titre}}</title>", "{{titre}}", "") ==
        "<title></title>");

    // Test de creerSondage

    assert(creerSondage("test", "test", "2018-01-01", "2018-01-02", "10h",
        "14h") == true);
    assert(creerSondage("test", "test", "2018-01-01", "2018-01-02", "10h",
        "14h") == true);
    assert(creerSondage("test", "Test-1", "2018-01-01", "2018-01-01", "10h",
        "10h") == true);
    assert(creerSondage("test", "test*", "2018-01-01", "2018-01-02", "10h",
        "14h") == false);
    assert(creerSondage("test", "test", "2018-01-04", "2018-01-02", "10h",
        "14h") == false);
    assert(creerSondage("test", "test", "2018-01-01", "2018-02-27", "10h",
        "14h") == false);
    assert(creerSondage("test", "test", "2018-01-01", "2018-01-02", "10h",
        "8h") == false);

    // Remet le .CSV a neuf en effacant les sondages tests

    ecrireCSV("./sondage.csv", "");
};

// testIndex();