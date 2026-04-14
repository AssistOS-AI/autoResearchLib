# Experiment 7 failure analysis

## Adversarial mechanics summary
| Policy | Budget | Accuracy | Truth retained | Mean IG | Harmful rate |
| --- | --- | --- | --- | --- | --- |
| information-gain | 0 | 0.5 | 0.897 | 0 | 0 |
| information-gain | 1 | 0.353 | 0.353 | 0.631 | 0.647 |
| information-gain | 2 | 0.353 | 0.353 | 0.634 | 0.574 |
| information-gain | 3 | 0.353 | 0.412 | 0.629 | 0.549 |
| random | 0 | 0.5 | 0.897 | 0 | 0 |
| random | 1 | 0.353 | 0.397 | 0.497 | 0.603 |
| random | 2 | 0.353 | 0.397 | 0.546 | 0.544 |
| random | 3 | 0.353 | 0.382 | 0.543 | 0.51 |
| top-domain | 0 | 0.5 | 0.897 | 0 | 0 |
| top-domain | 1 | 0.353 | 0.353 | 0.631 | 0.647 |
| top-domain | 2 | 0.353 | 0.353 | 0.634 | 0.574 |
| top-domain | 3 | 0.353 | 0.412 | 0.629 | 0.549 |

## Worst recoverability traces
| Case | Condition | Policy | Budget | Initial | Final | Questions | Truth retained |
| --- | --- | --- | --- | --- | --- | --- | --- |
| incident-postmortem__paraphrased | masked-adversarial | random | 3 | package | package | sample-temperature:yes | sample-temperature:no | package-tracking:yes | 0 |
| maintenance-generic__paraphrased | masked-adversarial | information-gain | 2 | manuscript | package | manuscript-review:no | package-dispatch:yes | 0 |
| maintenance-generic__paraphrased | masked-adversarial | information-gain | 3 | manuscript | package | manuscript-review:no | package-dispatch:yes | 0 |
| maintenance-generic__paraphrased | masked-adversarial | top-domain | 2 | manuscript | package | manuscript-review:no | package-dispatch:yes | 0 |
| maintenance-generic__paraphrased | masked-adversarial | top-domain | 3 | manuscript | package | manuscript-review:no | package-dispatch:yes | 0 |
| maintenance-generic__paraphrased | masked-adversarial | random | 2 | manuscript | manuscript | package-dispatch:no | manuscript-revision:yes | 0 |
| maintenance-generic__paraphrased | masked-adversarial | random | 3 | manuscript | manuscript | package-dispatch:no | manuscript-revision:yes | 0 |
| maintenance-generic__paraphrased | masked-adversarial | information-gain | 2 | manuscript | package | manuscript-review:no | package-dispatch:yes | 0 |
| maintenance-generic__paraphrased | masked-adversarial | information-gain | 3 | manuscript | package | manuscript-review:no | package-dispatch:yes | 0 |
| maintenance-generic__paraphrased | masked-adversarial | top-domain | 2 | manuscript | package | manuscript-review:no | package-dispatch:yes | 0 |
| maintenance-generic__paraphrased | masked-adversarial | top-domain | 3 | manuscript | package | manuscript-review:no | package-dispatch:yes | 0 |
| maintenance-generic__paraphrased | masked-adversarial | random | 2 | manuscript | sample | package-dispatch:no | sample-assay:yes | 0 |
