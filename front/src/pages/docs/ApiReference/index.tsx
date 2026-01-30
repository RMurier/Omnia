import AuthEndpoints from "./AuthEndpoints";
import ApplicationEndpoints from "./ApplicationEndpoints";
import LogEndpoints from "./LogEndpoints";
import ActivityEndpoints from "./ActivityEndpoints";

export default function ApiReferenceIndex() {
  return (
    <>
      <AuthEndpoints />
      <ApplicationEndpoints />
      <LogEndpoints />
      <ActivityEndpoints />
    </>
  );
}
