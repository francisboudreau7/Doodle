'use strict';

document.addEventListener('DOMContentLoaded', function () {

});

//met un crochet ou on clique et enleve un crochet si la case contient deja un crochet
function onClick(event) {
    /* La variable t contient l'élément HTML sur lequel le clic a été
       fait. Notez qu'il ne s'agit pas forcément d'une case <td> du
       tableau */
    var t = event.target;

    // Attribut id de l'élément sur lequel le clic a été fait
    var id = t.id;
    var x = document.getElementById(id).innerHTML;
    if (document.getElementById(id).tagName == "TD") {
        if (x === "") {
            document.getElementById(id).innerHTML = "&#10003;";
        } else {
            document.getElementById(id).innerHTML = "";
        }
    }

}
//rajoute des crochet(ou en enleve) lorsque on tient la souris enfoncee
function onMove(event) {

    var t = event.target;

    var id = t.id;
    if (event.buttons == 1) {
        if (event.toElement.tagName == "TD") {
            if (document.getElementById(id).innerHTML === "") {
                document.getElementById(id).innerHTML = "&#10003;";
            } else {
                document.getElementById(id).innerHTML = "";
            }
        }

    }
}
//retourne une chaine de 1 et de 0 correspondant au disponibilités du calendrier
var compacterDisponibilites = function () {
    var cal = document.getElementById("calendrier");
    var nbHeures = cal.dataset.nbheures;
    var nbJours = cal.dataset.nbjours;

    var chaineDispo = "";
    for (var i = 0; i < nbHeures; i++) {
        for (var j = 0; j < nbJours; j++) {
            var contenu = document.getElementById(j + "-" + i).innerHTML;
            if (contenu == "") {
                chaineDispo += "0"
            } else {
                chaineDispo += "1"
            }
        }
    }
    console.log(chaineDispo);
    return chaineDispo;
};