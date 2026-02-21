import React from "react";
import { V1_0_Fr, V1_0_En } from "./v1_0";

export type TermsComponent = React.ComponentType<{ styles: Record<string, React.CSSProperties> }>;

export interface TermsVersion {
  fr: TermsComponent;
  en: TermsComponent;
}

export const CURRENT_VERSION = "1.0";

export const VERSIONS: Record<string, TermsVersion> = {
  "1.0": { fr: V1_0_Fr, en: V1_0_En },
};

export const VERSION_LIST = Object.keys(VERSIONS).sort((a, b) =>
  b.localeCompare(a, undefined, { numeric: true })
);
