// chartsManager.js

import { showNotification } from './utils.js';

export class ChartsManager {
    constructor() {
        this.chart = null;
        this.department = '';
        this.courseNumber = '';
    }

    clearChart() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }

    renderChart(data, queryType, datasetId) {
        this.clearChart();

        if (queryType === 'gradeOverTime') {
            this.renderGradeOverTimeChart(data, datasetId);
        } else if (queryType === 'passFailOverTime') {
            this.renderPassFailOverTimeChart(data, datasetId);
        } else if (queryType === 'auditOverTime') {
            this.renderAuditOverTimeChart(data, datasetId);
        } else if (queryType === 'courseAverages') {
            this.renderCourseAveragesChart(data, datasetId);
        } else if (queryType === 'instructorAverages') {
            this.renderInstructorAveragesChart(data, datasetId);
        } else {
            showNotification("Chart rendering for the selected query is not implemented.", 'error');
        }
    }

    renderGradeOverTimeChart(data, datasetId) {
        const years = data.map(item => item[`${datasetId}_year`]);
        years[0] = "Overall";
        const avgGrades = data.map(item => item[`avgGrade`]);

        const ctx = document.getElementById("chart").getContext("2d");
        this.chart = new Chart(ctx, {
            type: "line",
            data: {
                labels: years,
                datasets: [
                    {
                        label: `Average Grade Over Time (${this.department.toUpperCase()} ${this.courseNumber})`,
                        data: avgGrades,
                        backgroundColor: "rgba(75, 192, 192, 0.6)",
                        borderColor: "rgba(75, 192, 192, 1)",
                        fill: false,
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: "Year", color: '#ffffff' },
                        ticks: { color: '#ffffff', precision: 0 }
                    },
                    y: {
                        title: { display: true, text: "Average Grade", color: '#ffffff' },
                        ticks: { color: '#ffffff' }
                    },
                },
            },
        });
    }

    renderPassFailOverTimeChart(data, datasetId) {
        const years = data.map(item => item[`${datasetId}_year`]);
        years[0] = "Overall";
        const passCounts = data.map(item => item['totalPass']);
        const failCounts = data.map(item => item['totalFail']);

        const ctx = document.getElementById("chart").getContext("2d");
        this.chart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: years,
                datasets: [
                    {
                        label: "Pass",
                        data: passCounts,
                        backgroundColor: "rgba(75, 192, 192, 0.6)",
                        borderColor: "rgba(75, 192, 192, 1)",
                        borderWidth: 1,
                    },
                    {
                        label: "Fail",
                        data: failCounts,
                        backgroundColor: "rgba(255, 99, 132, 0.6)",
                        borderColor: "rgba(255, 99, 132, 1)",
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: `Pass and Fail Counts Over Time (${this.department.toUpperCase()} ${this.courseNumber})`,
                        color: '#ffffff'
                    },
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: "Year", color: '#ffffff' },
                        stacked: false,
                        ticks: { color: '#ffffff' }
                    },
                    y: {
                        title: { display: true, text: "Number of Students", color: '#ffffff' },
                        beginAtZero: true,
                        ticks: { color: '#ffffff' }
                    },
                },
            },
        });
    }

    renderAuditOverTimeChart(data, datasetId) {
        const years = data.map(item => item[`${datasetId}_year`]);
        years[0] = "Overall";
        const auditCounts = data.map(item => item['totalAudit']);

        const ctx = document.getElementById("chart").getContext("2d");
        this.chart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: years,
                datasets: [
                    {
                        label: `Audited Students`,
                        data: auditCounts,
                        backgroundColor: "rgba(255, 206, 86, 0.6)",
                        borderColor: "rgba(255, 206, 86, 1)",
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: `Number of Audited Students Over Time (${this.department.toUpperCase()} ${this.courseNumber})`,
                        color: '#ffffff'
                    },
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: "Year", color: '#ffffff' },
                        ticks: { color: '#ffffff' }
                    },
                    y: {
                        title: { display: true, text: "Number of Students", color: '#ffffff' },
                        beginAtZero: true,
                        ticks: { color: '#ffffff' }
                    },
                },
            },
        });
    }

    renderCourseAveragesChart(data, datasetId) {
        // Process data to get most recent average grade per course
        const courseData = {};

        data.forEach(item => {
            const courseId = item[`${datasetId}_id`];
            const year = item[`${datasetId}_year`];
            const avgGrade = item['avgGrade'];

            if (!courseData[courseId] || courseData[courseId].year < year) {
                courseData[courseId] = { year, avgGrade };
            }
        });

        // Prepare data for the chart
        const courseIds = Object.keys(courseData);
        const avgGrades = courseIds.map(courseId => courseData[courseId].avgGrade);

        if (courseIds.length === 0) {
            showNotification("No course data available for the specified department.", 'error');
            return;
        }

        const ctx = document.getElementById("chart").getContext("2d");
        this.chart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: courseIds,
                datasets: [
                    {
                        label: `Most Recent Average Grade per Course (${this.department.toUpperCase()})`,
                        data: avgGrades,
                        backgroundColor: "rgba(54, 162, 235, 0.6)",
                        borderColor: "rgba(54, 162, 235, 1)",
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: `Most Recent Average Grades for ${this.department.toUpperCase()} Courses`,
                        color: '#ffffff'
                    },
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: "Course Number", color: '#ffffff' },
                        ticks: { color: '#ffffff' }
                    },
                    y: {
                        title: { display: true, text: "Average Grade", color: '#ffffff' },
                        beginAtZero: true,
                        ticks: { color: '#ffffff' }
                    },
                },
            },
        });
    }


    renderInstructorAveragesChart(data, datasetId) {
        // Process data to get most recent average grade per course
        const courseData = {};

        data.forEach(item => {
            const instructor = item[`${datasetId}_instructor`];
            const avgGrade = item['avgGrade'];

            if (!courseData[instructor] && !(/^[^a-zA-Z]*$/.test(instructor))) {
                courseData[instructor] = {avgGrade};
            }
        });

        // Prepare data for the chart
        const instructors = Object.keys(courseData);
        const avgGrades = instructors.map(instructor => courseData[instructor].avgGrade);

        if (instructors.length === 0) {
            showNotification("No course data available for the specified department.", 'error');
            return;
        }

        const ctx = document.getElementById("chart").getContext("2d");
        this.chart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: instructors,
                datasets: [
                    {
                        label: `Course Average Throughout the Years`,
                        data: avgGrades,
                        backgroundColor: "rgba(54, 162, 235, 0.6)",
                        borderColor: "rgba(54, 162, 235, 1)",
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: `Instructors' Course Averages Overview (${this.department.toUpperCase()} ${this.courseNumber})`,
                        color: '#ffffff'
                    },
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: "Instructor", color: '#ffffff' },
                        ticks: { color: '#ffffff' }
                    },
                    y: {
                        title: { display: true, text: "Average Grade", color: '#ffffff' },
                        beginAtZero: true,
                        ticks: { color: '#ffffff' }
                    },
                },
            },
        });
    }




}
