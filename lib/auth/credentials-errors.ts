import { CredentialsSignin } from "next-auth";

/** Lançado quando o Postgres não responde (DNS, rede, URL errada). */
export class DatabaseUnavailable extends CredentialsSignin {
  code = "database_unavailable";
}
