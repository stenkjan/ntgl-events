/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** Angemeldetes Mitglied im Bereich /intern */
    mitglied?: import('./lib/intern/rollen').Mitglied;
  }
}

interface ImportMetaEnv {
  /** Zeitpunkt des Builds (astro.config.mjs) */
  readonly BUILD_TIME: string;
}
