// import users from "./user.json" with { type: "json" };
import fs from 'fs'
// import * as ShopfloorFunction from './bundle/processor.js';
// import * as ShopfloorFunction from './ShpFLoorFunction/shopfloorTranaction.js';

export const config = {
    
    target: "www.google.com",
    processor: "./ShpFLoorFunction/shopfloorTranaction.js",

    payload: {
        path: "./user.json",
        field: ["username", "password","resource"],
        layoutImage: "./ShopFloorLayout.png", // Store the file path as a string
    },

   media :[
        {
            LayoutImage:'./LayoutImage.png'
        },
        {
            ArchitectImage:'./architect.png'
        },
        {
            ArchitectImage2:'./ShopFloorLayout.png'
        },
        {
            Logo:'./logo.png'
        }
    ],

    phases: {
        name: "Load Test ",
        duration: 180,
        arrivalRate: 1,
        rampUp: 1,
        maxUser: 1,

    }
};

// export const scenarios = [
//     {
//         name: "demo",
//         flowfunction: "demo",
//     },
// ];


export const scenarios =
{
    name: "performanceCopilet",
    flowFunction: "performanceCopilet",
};