import AuthErrors from "./AuthErrors";
import HmacErrors from "./HmacErrors";
import CommonIssues from "./CommonIssues";

export default function TroubleshootingIndex() {
  return (
    <>
      <AuthErrors />
      <HmacErrors />
      <CommonIssues />
    </>
  );
}
