# Experiment 5 failure analysis

## Lowest-performing domains
| Domain | Support | Precision | Recall | F1 | Mean truth rank |
| --- | --- | --- | --- | --- | --- |
| package | 36 | 0.507 | 0.944 | 0.66 | 1.056 |
| sample | 36 | 1 | 0.667 | 0.8 | 1.667 |
| manuscript | 36 | 0.78 | 0.889 | 0.831 | 1.111 |
| compliance | 24 | 1 | 0.75 | 0.857 | 1.545 |

## Most damaging frontier misses
| Case | Stage | Truth | Predicted | Confidence | Truth rank | Premature collapse |
| --- | --- | --- | --- | --- | --- | --- |
| maintenance-diagnostic__controlled | 1 | maintenance | package | 0.512 | - | 0 |
| maintenance-diagnostic__noisy | 1 | maintenance | package | 0.512 | - | 0 |
| maintenance-diagnostic__paraphrased | 1 | maintenance | package | 0.512 | - | 0 |
| maintenance-generic__controlled | 1 | maintenance | package | 0.512 | - | 0 |
| maintenance-generic__noisy | 1 | maintenance | package | 0.512 | - | 0 |
| procurement-generic__controlled | 1 | procurement | package | 0.512 | - | 0 |
| procurement-generic__noisy | 1 | procurement | package | 0.512 | - | 0 |
| procurement-payment-order__controlled | 1 | procurement | package | 0.512 | - | 0 |
| procurement-payment-order__noisy | 1 | procurement | package | 0.512 | - | 0 |
| procurement-payment-order__paraphrased | 1 | procurement | package | 0.512 | - | 0 |

## Frontier confusion matrix
| Actual | Predicted | Count |
| --- | --- | --- |
| package | package | 34 |
| package | manuscript | 2 |
| sample | package | 10 |
| sample | sample | 24 |
| sample | manuscript | 2 |
| manuscript | package | 4 |
| manuscript | manuscript | 32 |
| procurement | package | 5 |
| procurement | manuscript | 1 |
| procurement | procurement | 18 |
| maintenance | package | 5 |
| maintenance | manuscript | 1 |
| maintenance | maintenance | 18 |
| incident | package | 5 |
| incident | manuscript | 1 |
| incident | incident | 18 |
| compliance | package | 4 |
| compliance | manuscript | 2 |
| compliance | compliance | 18 |
