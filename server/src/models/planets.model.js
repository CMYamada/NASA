const { parse } = require('csv-parse');
const path = require('path');
const fs = require('fs');

const planets = require('./planets.mongo');

const isHabitablePlanet = (planet) => {
    return (planet['koi_disposition'] === 'CONFIRMED')
        && (planet['koi_insol'] > 0.36 && planet['koi_insol'] < 1.11)
        && (planet['koi_prad'] < 1.6);
}

function loadPlanetsData(){
    return new Promise((resolve, reject) => {
        fs.createReadStream(path.join(__dirname, '..', '..', 'data', 'kepler_data.csv'))
            .pipe(parse({
                comment: '#',
                columns: true
            }))
            .on('data', async (data) => {
                if(isHabitablePlanet(data)){
                    savePlanet(data);
                }
            })
            .on('error', (err) => {
                console.log(err);
                reject(err);
            })
            .on('end', async () => {
                const countPlanetsFound = (await getAllPlanets()).length;
                console.log(`${countPlanetsFound} found by kepler`);
                resolve();
            });
    });
}

async function getAllPlanets(){
    return await planets.find({}, {
        '_id': 0,
        '__v': 0,
    });
}

async function savePlanet(planet){
    try{
        // first argument is the filter, second is the 'replacement', upsert true means only do if it is not found
        await planets.updateOne({
            keplerName: planet.kepler_name,
        }, {
            keplerName: planet.kepler_name
        }, {
            upsert: true
        });
    }catch(err){
        console.error(`Could not save planet ${err}`);
    }
}

module.exports = {
    loadPlanetsData,
    getAllPlanets,
};