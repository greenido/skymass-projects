import { Alchemy, Network, NftFilters } from "alchemy-sdk";
import "dotenv/config";



const config = {
    apiKey: process.env["ALCHEMY_KEY"],
    network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(config);

const main = async () => {

    // Wallet address
    const address = "0x84A3e86beF9f31472453688bEf6d7f9b48e382a3";  //"elanhalpern.eth";

    // Get non-spam NFTs
    let nfts = await alchemy.nft.getNftsForOwner(address, { excludeFilters: [NftFilters.SPAM] });
    nfts = nfts['ownedNfts'];

    console.log("🎁 Non-Spam NFTs\n----------------\n\n");
    for (let i = 0; i < nfts.length; i++) {
        console.log("*", nfts[i].title)
    }
};

const runMain = async () => {
    try {
        await main();
        process.exit(0);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
};

runMain();