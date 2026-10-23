export class Test {

    constructor(scenario, user) {

        this.scenario = scenario;
        this.user = user;

        this.startTime = Date.now();

        this.result = {
            username: user.username,
            status: "Passed",
            steps: []
        };

    }


    async step(name, action) {

        const start = Date.now();

        try {

            await action();

            this.result.steps.push({
                name,
                status: "Passed",
                duration: Date.now() - start
            });

        }
        catch(err) {

            this.result.status = "Failed";

            this.result.steps.push({
                name,
                status: "Failed",
                duration: Date.now() - start,
                error: err.message
            });

            throw err;
        }

    }


    getResult(){

        return {
            scenario:this.scenario,
            username:this.user.username,
            status:this.result.status,
            duration:Date.now()-this.startTime,
            steps:this.result.steps
        };

    }

}