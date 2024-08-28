import { Trend } from 'k6/metrics';
import { Counter } from 'k6/metrics';

export const onboardDurationTrend = new Trend('App Onboard Duration', true);
export const enableAppDurationTrend = new Trend('Enable App Duration', true);
export const instantiatingTrend = new Trend('Instantiating Duration', true);
export const terminatingTrend = new Trend('Terminating Duration', true);
export const deleteAppWithInstanceTrend = new Trend('Delete App Instance Duration', true);
export const disableAppDurationTrend = new Trend('Disable App Duration', true);
export const deleteAppWithoutInstanceTrend = new Trend('Delete App Without Instance Duration', true);
export const counterErrors = new Counter('Errors');

//ACMR Trends
export const initializeDurationTrend = new Trend('ACM Initialize Duration', true);
export const deinitializeDurationTrend = new Trend('ACM Deinitialize Duration', true);
export const enableDurationTrend = new Trend('ACM Enable Duration', true);
export const disableDurationTrend = new Trend('ACM Disable Duration', true);
export const createAppInstanceDurationTrend = new Trend('ACM Create App Instance Duration', true);

export const onboardAppACMDurationTrend = new Trend('ACM Onboard App Duration', true); //done
export const undeployAppInstanceTrend = new Trend('ACM Undeploy App Instance Duration', true);
export const deleteAppInstanceTrend = new Trend('ACM Delete App Instance Duration', true);
export const deployAppInstanceTrend = new Trend('ACM Deploy App Instance Duration', true);
export const deleteOnboardingJobTrend = new Trend('ACM Delete Onboarding Job Duration', true); //this hasn't been implemented
export const getACMAppsTrend = new Trend('ACM Get Apps Duration', true);
export const getACMJobsTrend = new Trend('ACM Get Jobs Duration', true);
export const deleteAppACMTrend = new Trend('ACM Delete App Duration', true)

export const upgradeAppInstanceTrend = new Trend('ACM Upgrade App Instance Duration', true);
export const updateAppInstanceTrend = new Trend('ACM Update App Instance Duration', true);
