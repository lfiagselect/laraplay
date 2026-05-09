/**
 * LARAPLAY — Google Apps Script : Revalidation catalogue sur ajout Drive
 *
 * Principe : trigger temporel toutes les 5 minutes.
 * Compare la date du fichier le plus récent dans le dossier Drive
 * avec la dernière date connue (stockée dans PropertiesService).
 * Si un nouveau fichier est détecté → appelle /api/revalidate.
 *
 * INSTALLATION :
 * 1. Coller ce code dans script.google.com
 * 2. Remplir SECRET et FOLDER_ID ci-dessous
 * 3. Exécuter setupTrigger() UNE FOIS
 * 4. Tester avec testRevalidation()
 */

var SITE_URL  = "https://laraplay.netlify.app";
var SECRET    = "REMPLACER_PAR_REVALIDATE_SECRET";
var FOLDER_ID = "REMPLACER_PAR_GOOGLE_DRIVE_FOLDER_ID";

/**
 * Vérifie si un nouveau fichier a été ajouté dans le dossier Drive.
 * Déclenché toutes les 5 minutes par le trigger temporel.
 */
function checkDriveForNewFiles() {
  var props = PropertiesService.getScriptProperties();
  var lastCheck = props.getProperty("LAST_CHECK");
  var lastCheckDate = lastCheck ? new Date(lastCheck) : new Date(0);

  var folder = DriveApp.getFolderById(FOLDER_ID);
  var files = folder.getFiles();
  var hasNew = false;

  while (files.hasNext()) {
    var file = files.next();
    if (file.getDateCreated() > lastCheckDate) {
      hasNew = true;
      Logger.log("[LaraPlay] Nouveau fichier détecté : " + file.getName());
      break;
    }
  }

  props.setProperty("LAST_CHECK", new Date().toISOString());

  if (hasNew) {
    callRevalidate();
  } else {
    Logger.log("[LaraPlay] Aucun nouveau fichier.");
  }
}

/**
 * Appelle /api/revalidate sur LaraPlay.
 */
function callRevalidate() {
  var url = SITE_URL + "/api/revalidate?secret=" + SECRET + "&source=drive";
  try {
    var response = UrlFetchApp.fetch(url, {
      method: "post",
      muteHttpExceptions: true,
    });
    var code = response.getResponseCode();
    var body = response.getContentText();
    Logger.log("[LaraPlay] Revalidation → HTTP " + code + " : " + body);
  } catch (err) {
    Logger.log("[LaraPlay] Erreur revalidation : " + err.message);
  }
}

/**
 * Exécuter UNE FOIS pour installer le trigger temporel (toutes les 5 min).
 */
function setupTrigger() {
  // Supprimer les triggers existants pour éviter les doublons
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "checkDriveForNewFiles") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Trigger toutes les 5 minutes
  ScriptApp.newTrigger("checkDriveForNewFiles")
    .timeBased()
    .everyMinutes(5)
    .create();

  // Initialiser la date de référence à maintenant
  PropertiesService.getScriptProperties().setProperty("LAST_CHECK", new Date().toISOString());

  Logger.log("[LaraPlay] Trigger installé : vérification toutes les 5 minutes.");
}

/**
 * Test manuel : force la revalidation sans vérification Drive.
 */
function testRevalidation() {
  callRevalidate();
}

/**
 * Utilitaire : réinitialiser la date de référence à maintenant.
 */
function resetLastCheck() {
  PropertiesService.getScriptProperties().setProperty("LAST_CHECK", new Date().toISOString());
  Logger.log("[LaraPlay] LAST_CHECK réinitialisé à : " + new Date().toISOString());
}
