import { bindDb } from "../../db/index";
import { bindEnv, type WorkerEnv } from "../env";

export function bindRequest(env: WorkerEnv): void {
  bindEnv(env);
  bindDb(env.DB);
}
