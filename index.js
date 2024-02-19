import express from "express";
import axios from "axios";
import * as fs from 'fs';
import * as dotenv from "dotenv";

const server = express();

dotenv.config();

const port = process.env.PORT || 3000;
const NASA_ApiKey = process.env.NASA_API_KEY;

server.use(express.static("public"));

// ^ Description for curiosity credited to https://mars.nasa.gov/msl/mission/overview/
// ^ Description for spirit credited to https://www.jpl.nasa.gov/missions/mars-exploration-rover-spirit-mer-spirit
// ^ Description for opportunity credited to https://www.jpl.nasa.gov/missions/mars-exploration-rover-opportunity-mer
// ^ Description for perserverance credited to https://www.jpl.nasa.gov/missions/mars-2020-perseverance-rover

//json structure:
/*var json_obj = {

    rover_objs: [],

    apod_obj: {
        image: "",
        title: "",
        description: ""
    },

    date: ""
}*/

const inactive_rovers = ["spirit", "opportunity"]

const app_data = await readJsonFile();

server.get("/", async (req, res) => {

    if(app_data.date !== new Date().toDateString())
    {
        //Update json file
        for(let n = 0; n < app_data.rover_objs.length; n++)
        {
            app_data.rover_objs[n].photos = await getRover_Photos(app_data.rover_objs[n].name) || app_data.rover_objs[n].photos;
        }

        app_data.apod_obj = await getAPOD_Obj() || app_data.apod_obj;

        saveJsonData(app_data);
    }

    res.render("index.ejs", {data: app_data});
});


server.listen(port, () => {
    console.log(`Server running on port ${port}.`);
});

function randomNumber(upperbound)
{
    return Math.floor(Math.random() * upperbound) + 1;
}

async function getAPOD_Obj()
{
    try {
        const APOD_API_URL = `https://api.nasa.gov/planetary/apod?api_key=${NASA_ApiKey}`;
        const APOD_Data = await axios.get(APOD_API_URL);

        const tempObj = {
            image: APOD_Data.data.url,
            title: APOD_Data.data.title,
            description: APOD_Data.data.explanation,
            type: APOD_Data.data.media_type,
        };

        return tempObj;

    } catch (error) {
        console.log("Couldn't get APOD Data: " + error);

        return null;
    }
};

async function getRover_Photos(rover_name)
{
    var photos_response;
    try {
        if(!getInactiveRovers().includes(rover_name.toLowerCase()))
        {
            photos_response = await axios.get(`https://api.nasa.gov/mars-photos/api/v1/rovers/${rover_name}/latest_photos?api_key=${NASA_ApiKey}`);
            return photos_response.data.latest_photos;
        }
        else
        {
            var randSol = randomNumber(getMaxSol(rover_name));
            console.log(randSol);
            photos_response = await axios.get(`https://api.nasa.gov/mars-photos/api/v1/rovers/${rover_name}/photos?sol=${randSol}&api_key=${NASA_ApiKey}`);

            while(photos_response.data.photos.length < 25)
            {
                randSol = randomNumber(getMaxSol(rover_name));
                photos_response = await axios.get(`https://api.nasa.gov/mars-photos/api/v1/rovers/${rover_name}/photos?sol=${randSol}&api_key=${NASA_ApiKey}`);
            }
            return photos_response.data.photos;
        }

    } catch (error) {
        console.log(`Couldn't get data for ${rover_name}: ${error}`);

        return null;
    }

};

function getInactiveRovers()
{
    
    var returnArray = [];

    for(let n =0; n < app_data.rover_objs.length; n++)
    {
        if(app_data.rover_objs[n].photos[0].rover.status == "complete")
        {
            returnArray.push(app_data.rover_objs[n].name.toLowerCase())
        }
    }

    return returnArray;
}

function getMaxSol(rover_name)
{
    const rover_obj = app_data.rover_objs.find((rover) => rover.name.toLowerCase() == rover_name.toLowerCase());

    return rover_obj.photos[0].rover.max_sol;
}

function saveJsonData(data)
{
    data.date = new Date().toDateString();
    
    const new_data = JSON.stringify(data);
    fs.writeFile("red_planet_gallery.json", new_data, (error) => {
        if(error){
            console.error(error);
            throw error;
        }

        console.log("json file updated!");
    });
}

async function readJsonFile()
{
    try {
        const jsonData = fs.readFileSync("red_planet_gallery.json");
        const js_obj = await JSON.parse(jsonData);
    
        return js_obj;
    } catch (error) {
        console.log("Couldn't read from json file: " + error);
    }
}

