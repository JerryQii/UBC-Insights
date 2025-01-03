// queryManager.js

import { showNotification } from './utils.js';
import { getSelectedDataset } from './datasetManager.js';
import { ChartsManager } from './chartManager.js';

const chartManager = new ChartsManager();

export function runQuery() {
    const selectedDataset = getSelectedDataset();

    if (!selectedDataset) {
        showNotification("Please select a dataset first.", 'error');
        return;
    }

    const datasetId = selectedDataset.id;
    const datasetKind = selectedDataset.kind;

    // Convert department code to lowercase
    const department = document.getElementById('departmentInput').value.trim().toLowerCase();
    const courseNumber = document.getElementById('courseNumberInput').value.trim();
    const selectedQuery = document.getElementById('querySelect').value;

    if (datasetKind !== 'sections') {
        showNotification("The selected query is only applicable to Sections datasets.", 'error');
        return;
    }

    // Build the query based on user input
    let query = buildQuery(selectedQuery, datasetId, department, courseNumber);

    if (!query) {
        return; // Error message already shown in buildQuery
    }

    // Log the query for debugging purposes
    console.log('Query sent to server:', JSON.stringify(query));

    // Fetch data based on the query
    fetch("/query", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(query),
    })
        .then((response) => {
            return response.json().then((data) => ({ status: response.status, body: data }));
        })
        .then(({ status, body }) => {
            if (status === 200) {
                const resultData = body.result;
                if (resultData.length === 0) {
                    showNotification("No data found for the specified query.", 'error');
                    chartManager.clearChart();
                } else {
                    // Store department and courseNumber in chartManager for labeling
                    chartManager.department = department;
                    chartManager.courseNumber = courseNumber || '';
                    chartManager.renderChart(resultData, selectedQuery, datasetId);
                }
            } else {
                console.error(`Server Error: ${body.error}`);
                showNotification(`Error fetching data: ${body.error}`, 'error');
            }
        })
        .catch((err) => {
            console.error(err);
            showNotification("Network error while fetching data.", 'error');
        });
}

function buildQuery(selectedQuery, datasetId, department, courseNumber) {
    let query = {};

    if (selectedQuery === 'courseAverages') {
        if (!department) {
            showNotification("Please enter a department code.", 'error');
            return null;
        }

        query = {
            WHERE: {
                IS: { [`${datasetId}_dept`]: department }
            },
            OPTIONS: {
                COLUMNS: [
                    `${datasetId}_id`,
                    `${datasetId}_year`,
                    'avgGrade'
                ],
                ORDER: {
                    "dir": "UP",
                    "keys": [
                        `${datasetId}_id`,
                        `${datasetId}_year`
                    ]
                }
            },
            TRANSFORMATIONS: {
                GROUP: [
                    `${datasetId}_id`,
                    `${datasetId}_year`
                ],
                APPLY: [
                    {
                        avgGrade: {
                            AVG: `${datasetId}_avg`
                        }
                    }
                ]
            }
        };
    } else {
        // For other queries, both department and course number are required
        if (!department || !courseNumber) {
            showNotification("Please enter both department code and course number.", 'error');
            return null;
        }

        if (selectedQuery === 'gradeOverTime') {
            query = {
                WHERE: {
                    AND: [
                        { IS: { [`${datasetId}_dept`]: department } },
                        { IS: { [`${datasetId}_id`]: courseNumber } }
                    ]
                },
                OPTIONS: {
                    COLUMNS: [
                        `${datasetId}_year`,
                        `avgGrade`
                    ],
                    ORDER: `${datasetId}_year`
                },
                TRANSFORMATIONS: {
                    GROUP: [
                        `${datasetId}_year`
                    ],
                    APPLY: [
                        {
                            avgGrade: {
                                AVG: `${datasetId}_avg`
                            }
                        }
                    ]
                }
            };
        } else if (selectedQuery === 'passFailOverTime') {
            query = {
                WHERE: {
                    AND: [
                        { IS: { [`${datasetId}_dept`]: department } },
                        { IS: { [`${datasetId}_id`]: courseNumber } }
                    ]
                },
                OPTIONS: {
                    COLUMNS: [
                        `${datasetId}_year`,
                        'totalPass',
                        'totalFail'
                    ],
                    ORDER: `${datasetId}_year`
                },
                TRANSFORMATIONS: {
                    GROUP: [
                        `${datasetId}_year`
                    ],
                    APPLY: [
                        {
                            totalPass: {
                                SUM: `${datasetId}_pass`
                            }
                        },
                        {
                            totalFail: {
                                SUM: `${datasetId}_fail`
                            }
                        }
                    ]
                }
            };
        } else if (selectedQuery === 'auditOverTime') {
            query = {
                WHERE: {
                    AND: [
                        { IS: { [`${datasetId}_dept`]: department } },
                        { IS: { [`${datasetId}_id`]: courseNumber } }
                    ]
                },
                OPTIONS: {
                    COLUMNS: [
                        `${datasetId}_year`,
                        'totalAudit'
                    ],
                    ORDER: `${datasetId}_year`
                },
                TRANSFORMATIONS: {
                    GROUP: [
                        `${datasetId}_year`
                    ],
                    APPLY: [
                        {
                            totalAudit: {
                                SUM: `${datasetId}_audit`
                            }
                        }
                    ]
                }
            };
        } else if (selectedQuery === 'instructorAverages') {
            query = {
                WHERE: {
                    AND: [
                        { IS: { [`${datasetId}_dept`]: department } },
                        { IS: { [`${datasetId}_id`]: courseNumber } }
                    ]
                },
                OPTIONS: {
                    COLUMNS: [
                        `${datasetId}_instructor`,
                        'avgGrade'
                    ],
                    ORDER: `avgGrade`
                },
                TRANSFORMATIONS: {
                    GROUP: [
                        `${datasetId}_instructor`
                    ],
                    APPLY: [
                        {
                            avgGrade: {
                                AVG: `${datasetId}_avg`
                            }
                        }
                    ]
                }
            };
        } else {
            showNotification("Selected query is not implemented.", 'error');
            return null;
        }
    }

    return query;
}
