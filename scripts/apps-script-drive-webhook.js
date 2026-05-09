/**
 * LARAPLAY — Google Apps Script : Trigger revalidation sur ajout Drive
 *
 * INSTALLATION :
 * 1. Aller sur https://script.google.com
 * 2. Créer un nouveau projet
 * 3. Coller ce code
 * 4. Remplacer SITE_URL et SECRET ci-dessous
 * 5. Exécuter setupTrigger() UNE FOIS pour installer le trigger
 * 6. Autoriser les permissions demandées
 *
 * Le trigger se déclenchera automatiquement lors de tout changement
 * dans le dossier Drive (ajout, renommage, suppression).
 *
 * IMPORTANT : remplacer les valeurs ci-dessous avant déploiement.
 */

var SITE_URL = "https://laraplay.netlify.app"; // URL de production
var SECRET   = "REMPLACER_PAR_REVALIDATE_SECRET";  // valeur de REVALIDATE_SECRET dans Netlify
var FOLDER_ID = "REMPLACER_PAR_GOOGLE_DRIVE_FOLDER_ID"; // ID du dossier Drive vidéos

/**
 * Appelle /api/revalidate sur le site pour invalider le cache catalogue.
 * Déclenché automatiquement par le trigger Drive.
 */
function onDriveChange(e) {
  var url = SITE_URL + "/api/revalidate?secret=" + SECRET + "&source=drive";
  try {
    var response = UrlFetchApp.fetch(url, {
      method: "post",
      muteHttpExceptions: true,
    });
    var code = response.getResponseCode();
    var body = response.getContentText();
    Logger.log("[LaraPlay] Revalidation Drive → HTTP " + code + " : " + body);
  } catch (err) {
    Logger.log("[LaraPlay] Erreur revalidation : " + err.message);
  }
}

/**
 * Exécuter cette fonction UNE FOIS pour installer le trigger Drive.
 * Menu : Exécuter > setupTrigger
 */
function setupTrigger() {
  // Supprimer les triggers existants du même type pour éviter les doublons
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "onDriveChange") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Créer le trigger sur le dossier Drive
  ScriptApp.newTrigger("onDriveChange")
    .forDrive()
    .onChangeFile()
    .create();

  Logger.log("[LaraPlay] Trigger Drive installé avec succès.");
}

/**
 * Test manuel : exécuter cette fonction pour vérifier que tout fonctionne
 * sans attendre un vrai changement Drive.
 */
function testRevalidation() {
  onDriveChange(null);
}
