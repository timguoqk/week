# WEEK: A visualization of my time usage

*For Assignment 2 of CSCI2951-r at Brown University.*

I've been tracking my time usage from Mar 2 to Mar 15. Here I visualized a week of my time and compare it with the data of full-time American college students.

## Introduction
## What did you visualize?
I visualized

* how I spent my week
* how an average US college student spent their week

by showing

* a grid of actual time usage
* a bar chart of total time spent on each category of activities
* a line chart of total time spent on given category for different days of the week.

## How do you spend your days?
I sleep, study, play and spend around 5-10 minutes travelling between each activity.

## What was surprising?
- Check my privillege: I don't work at all.
- I study too much time studying and too little time sleeping.
- I play more on weekday.
- My time usage resembles very little of the usage of students surveryed.

## Method

- Activities are coded using the coding scheme of [American Time Use Survey 2014](http://www.bls.gov/tus/datafiles_2014.htm).
- Data are collected using [Timesheet](https://play.google.com/store/apps/details?id=com.rauscha.apps.timesheet) on Android.
- Using data of [American Time Use Survey 2014](http://www.bls.gov/tus/datafiles_2014.htm), I processed the data of all full-time college students.
- For each 10-min period, I calculate what most respondents in the study were doing. Then I visualize this derived time use data on the top-right, for comparision with my data.
- The first week's data are in `timesheet1.csv` while `timesheet2.csv` contains the second week's data. The website loads `timesheet.csv`.

## TODO

- Refactor code with React.js.
- Better display of the day-of-week chart.
- More efficient code.