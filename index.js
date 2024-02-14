import express from "express";
import axios from "axios";
import * as fs from 'fs';
import * as dotenv from "dotenv";

const server = express();

dotenv.config();

const port = process.env.PORT || 3000;
const NASA_ApiKey = process.env.NASA_API_KEY;
const APOD_API_URL = `https://api.nasa.gov/planetary/apod?api_key=${NASA_ApiKey}`;

server.use(express.static("public"));

const rovers = ["Curiosity", "Spirit", "Opportunity", "Perseverance"];

const rover_info = {
    rover_names: rovers,
    rover_images: ["./images/curiosity.png", "./images/spirit_rover(smaller).png", "./images/Opportnunity_rover.png", "./images/perseverance_rover.png"],
    rover_descriptions: ["Part of NASA's Mars Science Laboratory mission, Curiosity is the largest and most capable rover ever sent to Mars.<br /><br />Curiosity set out to answer the question: Did Mars ever have the right environmental conditions to support small life forms called microbes? Early in its mission, Curiosity's scientific tools found chemical and mineral evidence of past habitable environments on Mars. It continues to explore the rock record from a time when Mars could have been home to microbial life.",
                        // ^ Description credited to https://mars.nasa.gov/msl/mission/overview/
                        "One of two rovers launched in 2003 to explore Mars and search for signs of past life, Spirit far outlasted her planned 90-day mission, lasting over six years. Among her myriad discoveries, Spirit found evidence that Mars was once much wetter than it is today and helped scientists better understand the Martian wind. <br /><br />In May 2009, the rover became embedded in soft soil at a site called 'Troy' with only five working wheels to aid in the rescue effort. After months of testing and carefully planned maneuvers, NASA ended efforts to free the rover and eventually ended the mission on May 25, 2011.",
                        // ^ Description credited to https://www.jpl.nasa.gov/missions/mars-exploration-rover-spirit-mer-spirit
                        "Opportunity was the second of the two rovers launched in 2003 to land on Mars and begin traversing the Red Planet in search of signs of ancient water. The rover explored the Martian terrain for almost 15 years, far outlasting her planned 90-day mission.<br /><br />After landing on Mars in 2004, Opportunity made a number of discoveries about the Red Planet including dramatic evidence that long ago at least one area of Mars stayed wet for an extended period and that conditions could have been suitable for sustaining microbial life.<br /><br /> The Opportunity rover stopped communicating with Earth when a severe Mars-wide dust storm blanketed its location in June 2018. After more than a thousand commands to restore contact, engineers in the Mission Control at NASA's Jet Propulsion Laboratory (JPL) made their last attempt to revive Opportunity Tuesday, February 13, 2019, to no avail. The solar-powered rover's final communication was received June 10. <br/><br/><span class='last_words'> Oppurtunity's last transmission was:<br/>" + `"My battery is low and it's getting dark."</span>`,
                        // ^ Description credited to https://www.jpl.nasa.gov/missions/mars-exploration-rover-opportunity-mer
                        "The Perseverance Mars rover is part of NASA’s Mars Exploration Program, a long-term effort of robotic exploration of the Red Planet. A key objective for Perseverance’s mission on Mars is astrobiology, including the search for signs of ancient microbial life.<br/><br/>Perseverance is investigating Jezero Crater – a region of Mars where the ancient environment may have been favorable for microbial life – probing the Martian rocks for evidence of past life. The rover carries an entirely new subsystem to collect and prepare Martian rocks and sediment samples that includes a coring drill on its arm and a rack of sample titanium tubes in its chassis. Throughout its exploration of the region, the rover will collect promising samples, sealing them are tubes and storing them in its chassis until Perseverance deposits them on the Martian surface to be retrieved by a future mission. Perseverance will likely create multiple “depots” later in the mission for this purpose. increases the likelihood that especially valuable samples will be accessible for retrieval. Subsequent NASA missions, in cooperation with ESA (European Space Agency), would send spacecraft to Mars to collect these sealed samples from the surface and bring them to Earth for in-depth analysis using powerful laboratory equipment too large to take to Mars.<br/><br>Two science instruments mounted on the rover’s robotic arm are used to search for signs of past life and determine where to collect samples by analyzing the chemical, mineral, physical, and organic characteristics of Martian rocks. On the rover’s mast, two science instruments provide high-resolution imaging and three types of spectroscopy for characterizing rocks and soil from a distance, also helping to determine which rock targets to explore up close.<br/><br/>The Perseverance rover used the same sky crane landing system as Curiosity, but with the ability to land in more challenging terrain with two enhancements, making more rugged sites eligible as safe landing candidates."],
                        // ^ Description credited to https://www.jpl.nasa.gov/missions/mars-2020-perseverance-rover
    rover_manifests: [4],
    photos: [],
    date: ""
};


server.get("/", async (req, res) => {

    try {

        var response;
        var apod_fail = false;
        try {
            response = await axios.get(APOD_API_URL);
        } catch (error) {
            console.log(error);
            apod_fail = true;
        }


        const jsonData = fs.readFileSync("rover_info.json");
        const rover_obj = JSON.parse(jsonData);

        if (rover_obj.date === new Date().toDateString())
        {
            if(!apod_fail)
            {
                res.render("index.ejs", {APOD: response.data, rover_data: rover_obj});
            }
            else{
                res.render("index.ejs", {rover_data: rover_obj});
            }
            console.log("Fetched cached data.");
        }
        else
        {
            try{
                //getting rover data and imagery from api
                for(let n = 0; n < rovers.length; n++)
                {
                    var rover_response = await axios.get(`https://api.nasa.gov/mars-photos/api/v1/manifests/${rovers[n]}?api_key=${NASA_ApiKey}`);
                    let rover_mission_data = {
                        landing_date: rover_response.data.photo_manifest.landing_date,
                        launch_date: rover_response.data.photo_manifest.launch_date,
                        status: rover_response.data.photo_manifest.status,
                        max_sol: rover_response.data.photo_manifest.max_sol,
                        max_date: rover_response.data.photo_manifest.max_date,
                        total_photos: rover_response.data.photo_manifest.total_photos
                    };
                    rover_info.rover_manifests[n] = rover_mission_data;

                    var photos_response;
                    var imagery = [4];
                    if(rover_response.data.photo_manifest.status !== "active")
                    {
                        var randSol = randomNumber(rover_response.data.photo_manifest.max_sol -1);
                        photos_response = await axios.get(`https://api.nasa.gov/mars-photos/api/v1/rovers/${rovers[n]}/photos?sol=${randSol}&api_key=${NASA_ApiKey}`);

                        while(photos_response.status != 200 || photos_response.data.photos.length < 25)
                        {
                            randSol = randomNumber(rover_response.data.photo_manifest.max_sol -1);
                            photos_response = await axios.get(`https://api.nasa.gov/mars-photos/api/v1/rovers/${rovers[n]}/photos?sol=${randSol}&api_key=${NASA_ApiKey}`);
                        }


                        imagery[n] = photos_response.data.photos;
                    }
                    else
                    {
                        photos_response = await axios.get(`https://api.nasa.gov/mars-photos/api/v1/rovers/${rovers[n]}/latest_photos?api_key=${NASA_ApiKey}`);
                        imagery[n] = photos_response.data.latest_photos;
                    }
                    
                    rover_info.photos.push(imagery[n]);
                }
                rover_info.date = new Date().toDateString();
        
                //updating json file
                const data = JSON.stringify(rover_info);
                fs.writeFile("rover_info.json", data, (error) => {
                    if(error){
                        console.error(error);
                        throw error;
                    }
        
                    console.log("json file updated!");
                });
        
                if(!apod_fail)
                {
                    res.render("index.ejs", {APOD: response.data, rover_data: rover_info});
                }
                else
                {
                    res.render("index.ejs", {rover_data: rover_info});
                }
            }
            catch(error)
            {
                console.error("Error: " + error.message);
            }
        }

    } catch (error) {
        console.error(error);
    }
});


server.listen(port, () => {
    console.log(`Server running on port ${port}.`);
});

function randomNumber(upperbound)
{
    return Math.floor(Math.random() * upperbound) + 1;
}

