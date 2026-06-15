# UET LMS Survey Auto-Fill

A Tampermonkey user script that automates filling out course and faculty evaluation surveys on the UET LMS portal. It handles the portal's single-page application routing and safely manages page load times to ensure all surveys in a list are completed without manual intervention.

## Installation

1. Install the Tampermonkey extension for your browser:
   * [Tampermonkey for Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   * [Tampermonkey for Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
2. [Click Here to Install the Script](https://raw.githubusercontent.com/umerkniazi/uet-lms-survey-autofill/refs/heads/main/uet-survey-autofill.user.js).
3. Click "Install" when the Tampermonkey dashboard opens.

## Usage

1. Log into your UET LMS Portal.
2. Navigate to your Semester List or Subjects List.
3. You will see a green "Auto-Fill All Surveys" button in the top right corner. Click it to start.
4. **Note:** If your browser stops the script, ensure you click the blocked pop-up icon in your URL bar and select "Always allow pop-ups and redirects from https://lms.uet.edu.pk".
5. The script will automatically navigate through the lists, fill the surveys, submit them, and stop itself when all available surveys are finished.

## Configuration

By default, the script sets Attendance to `81-100` and gives a Rating of `4` for all other questions. To change these answers, open the script in your Tampermonkey dashboard and edit the following variables at the top of the file:

```javascript
const RATING = '4';              // Target label for standard rating questions
const ATTENDANCE = '81-100';     // Target label for attendance questions