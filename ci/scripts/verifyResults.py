import json
import os

rAppStaging = os.environ['RAPP_STAGING']
f = open('summary.json',)
data = json.load(f)

number_of_passed_tests = data['metrics']['checks']['values']['passes']
number_of_failed_tests = data['metrics']['checks']['values']['fails']

if number_of_failed_tests >= 1:
    print("App Engineering Testcases Failed! please check the logs.")
    print("Number of test cases passed: %s" % number_of_passed_tests)
    print("Number of test cases failed: : %s" % number_of_failed_tests)
    exit(1)
else:
    print("K6 e2e flow is working and all testcases are passed!")
    print("Number of test cases passed: %s" % number_of_passed_tests)
    print("Number of test cases failed: : %s" % number_of_failed_tests)
    exit(0)
