const launches = require('./launches.mongo');
const planets = require('./planets.mongo');
const axios = require('axios');

const SPACEX_API_URL = 'https://api.spacexdata.com/v4/launches/query';

async function populateLaunches() {
    console.log('Downloading Launch Data...');
    const response = await axios.post(SPACEX_API_URL,
        {
            query: {},
            options: {
                pagination: false,
                populate: [
                    {
                        path: 'rocket',
                        select: {
                            name: 1
                        }
                    },
                    {
                        path: 'payloads',
                        select: {
                            'customers': 1
                        }
                    }
                ]
            }
        }
    );

    if(response.status !== 200){
        console.log('Problem downloading launch data');
        throw new Error('Launch data download failed');
    }
    const launchDocs = response.data.docs;
    for(const launchDoc of launchDocs){
        const payloads = launchDoc['payloads'];
        // flatmap runs callback and puts all the retuns into a 1d array
        const customers = payloads.flatMap((payload) => {
            return payload['customers'];
        })
        const launch = {
            flightNumber: launchDoc['flight_number'],
            mission: launchDoc['name'],
            rocket: launchDoc['rocket']['name'],
            launchDate: launchDoc['date_local'],
            upcoming: launchDoc['upcoming'],
            success: launchDoc['success'],
            upcoming: launchDoc['upcoming'],
            customers,
        };
        console.log(`${launch.flightNumber} ${launch.mission}`);
        await saveLaunch(launch);
    }
}

async function loadLaunchData(){
    const firstLaunch = await findLaunch({
        flightNumber: 1,
        rocket: 'Falcon 1',
        mission: 'FalconSat',
    });
    if(firstLaunch){
        console.log('Launch data already loaded!');
    } else{
        await populateLaunches();
    }
    
}

async function findLaunch(filter){
    return await launches.findOne(filter);
}

async function existsLaunchWithId(launchId){
    return await findLaunch({
        flightNumber: launchId,
    });
}

async function getLatestFlightNumber(){
    const latestLaunch = await launches
        .findOne()
        .sort('-flightNumber');
    if(!latestLaunch){
        return DEFAULT_FLIGHT_NUMBER;
    }
    return latestLaunch.flightNumber;
}

async function getAllLaunches(skip, limit){
    return await launches
    .find({}, {'_id': 0, '__v': 0,})
    .sort({flightNumber: 1})
    .skip(skip)
    .limit(limit);
}

async function saveLaunch(launch){
    const planet = await planets.findOne({
        keplerName: launch.target,
    });

    await launches.findOneAndUpdate(
        {
            flightNumber: launch.flightNumber,
        },
        launch,
        {
            upsert: true,
        }
    )
}

async function scheduleNewLaunch(launch){
    const newFlightNumber = await getLatestFlightNumber() + 1;
    if(!planet){
        throw new Error('No matching planet was found');
    }
    const newLaunch = Object.assign(launch,{
        success: true,
        upcoming: true,
        customers: ['NASA', 'Yamada Family'],
        flightNumber: newFlightNumber,
    });
    await saveLaunch(launch);
}

async function abortLaunchById(launchId){
    const aborted = await launches.updateOne({
        flightNumber: launchId
    }, {
        upcoming: false,
        success: false,
    });
    return aborted.modifiedCount === 1;
}

module.exports = {
    getAllLaunches,
    scheduleNewLaunch,
    existsLaunchWithId,
    abortLaunchById,
    loadLaunchData,
};