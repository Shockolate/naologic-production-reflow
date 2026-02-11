# Reflow Service

## Description

Ted Armstrong's (GH: Shockolate) solution to the Naologic Reflow Algorithm technical assessment.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Run arbitrary Workflow Documents

After starting the server, perform a POST to `localhost:3000/reflow` with the body being a collection of documents:

```jsonc
{
  "documents": [
    {
      "docId": "doc1",
      "docType": "workOrder",
      "data": {
        // ....
      }
    },
    // ...
  ]
}
```

## Algorithm Design

1. Sort the Work Orders by startTime, ensuring that all maintenance tasks are first to ensure that they are processed with priority.
2. Build a dependency DAG between work orders and their parents. Avoid cycles and sort by topological order.
3. For each Work Center, maintain a sorted list of booked wall-clock intervals. Pre-load the maintenance Work Order intervals.
4. For each Work Order in topological order, calculate the earliest start by the Max of all completion dates of all predecessors
5. For that Work Order's Work Center, calculate the First Free Slot using the previous earliestStart, including the Work Center's previously booked intervals. Calculate the interval by respecting Shift and Maintenance windows, and then addWorkingMinutes.\
6. Record the assignment of the Work Order's start and end times. Populate the Booked Work Center's interval array with the new assignment, and populate the map of Completion Times with the Work Order's end time.

**This yields one workstation per WorkOrder, no overlaps, dependencies preserved, and work only during shifts and outside maintenance windows.**
