describe("Leave Balance Tests", () => {

    test("Should approve leave when balance is sufficient", () => {

        const availableBalance = 10;
        const requestedDays = 3;

        const result =
            availableBalance >= requestedDays;

        expect(result).toBe(true);
    });

    test("Should reject leave when balance is insufficient", () => {

        const availableBalance = 2;
        const requestedDays = 5;

        const result =
            availableBalance >= requestedDays;

        expect(result).toBe(false);
    });

    test("Should calculate leave days correctly", () => {

        const fromDate = new Date("2026-10-10");
        const toDate = new Date("2026-10-12");

        const difference =
            toDate.getTime() -
            fromDate.getTime();

        const days =
            Math.floor(
                difference /
                (1000 * 60 * 60 * 24)
            ) + 1;

        expect(days).toBe(3);
    });

});