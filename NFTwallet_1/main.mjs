/*
  An NFT wallet that let you mark SPAM NFTs and remove them.
  @author: @greenido
  @date: FEB-2023

  @see:

  opensea listing json format:
    floorPrice: 1.1, 
    collectionName: 'Moonbirds Oddities', 
    safelistRequestStatus: 'verified', 
    imageUrl: 'https://i.seadn.io/gae/M3yJrT9TRLmE8sZb8TjyA…agm6h86548W5hmCva2kQ2rC_Q?w=500&auto=format', 
    description: '10,000 Moonbird pellets, regurgitated from…llocated at random through the collection.', …}
    collectionName: 'Moonbirds Oddities'
    description: '10,000 Moonbird pellets, regurgitated from the imagination of artist Gremplin and revealed in July 2022. Each Oddity is derived from a Moonbird, with a smattering of new traits and features allocated at random through the collection.'
    discordUrl: 'https://discord.gg/Xv7E796DDP'
    externalUrl: 'https://www.oddities.xyz/'
    floorPrice: 1.1
    imageUrl: 'https://i.seadn.io/gae/M3yJrT9TRLmE8sZb8TjyAbDJYBCoCWFFXGXd61G7d5pDESUPfGVocjmg4V9JlyGCr9ENri36cisKdagm6h86548W5hmCva2kQ2rC_Q?w=500&auto=format'
    lastIngestedAt: '2023-02-10T13:10:13.000Z'
    safelistRequestStatus: 'verified'
*/
import { SkyMass } from "@skymass/skymass";
import { Alchemy, Network, NftFilters } from "alchemy-sdk";
import "dotenv/config";

const config = {
  apiKey: process.env["ALCHEMY_KEY"],
  network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(config);
const nftsArray = new Array();

//
//
//
async function getNFTs(address) {
  // Wallet address
  console.log(`== Going to check address: ${address}` );

  // Get non-spam NFTs
  let nfts = await alchemy.nft.getNftsForOwner(address, { excludeFilters: [NftFilters.SPAM] });
  nfts = nfts['ownedNfts'];
  
  console.log("🎁 Non-Spam NFTs\n----------------\n\n");
  for (let i = 0; i < nfts.length; i++) {
      let cNFT = nfts[i];
      let media = "";
      if (cNFT.media && cNFT.media[0]) {
        media = cNFT.media[0].thumbnail;
      }
      if (i == 1) console.log(cNFT);
      nftsArray.push( [cNFT.title, cNFT.tokenId, cNFT.description, 
        cNFT.tokenType,
        cNFT.contract.address,
        cNFT.contract.name,
        `<img src="${media}" alt="nft media" />`
      ] ); 
  }
  return nftsArray;
};

//
const NF = new Intl.NumberFormat();
function format_number(num) {
  return NF.format(num);
}

function truncate(str, n){
  return (str.length > n) ? str.slice(0, n-1) : str;
};

//
// Start the skymass party 🎉
//
const sm = new SkyMass({ key: process.env["SKYMASS_KEY"] });

sm.page("/m", async (ui) => {
  const { nfts } = ui.getState(() => ({ nfts: [] }));

  ui.md`## 🧮 NFT Wallet Viewer`;

  const address = ui.string("address", {
    label: "Your NFTs Address",
    placeholder: "e.g. vitalik.eth",
    required: true,
    // TODO... change this one
    defaultVal: "0x84A3e86beF9f31472453688bEf6d7f9b48e382a3", 
  });

  const go = ui.button("button", {
    // Disable until input is in a valid state... (eg not blank)
    disabled: !address.isReady, 
    label: "Go!",
  });

  if (go.didClick) {
    ui.toast("👋🏼 Fetching all your NFTs");
    const result = await alchemy.nft.getNftsForOwner(address.val, {
      excludeFilters: [NftFilters.SPAM],
    });
    // convert results into an array good for showing in a table
    const owned = result.ownedNfts.map((nft) => {
      let nftName = "No name :/";
      if (nft.title == "#9338") {
        console.log("=================  9338  ===================");
        console.log(nft);
      }
      
      //console.log(nft.contract);
      if (nft.contract && nft.contract.name) {
        nftName = nft.contract.name;
      }
      let nftImg = nft.media?.[0]?.thumbnail;
      if (!nftImg) {
        nft.media?.[0]?.gateway;
      }
      return {
        tokenId: truncate(nft.tokenId, 10),
        title: nft.title,
        thumbnail: nftImg,
        description: truncate(nft.description, 200),
        type: nft.tokenType,
        address: "https://etherscan.io/address/" + nft.contract.address,
        name: nftName,
        safelistRequestStatus: nft.contract.openSea.safelistRequestStatus,
        floorPrice: nft.contract.openSea.floorPrice ? nft.contract.openSea.floorPrice : "" ,
        opensea: "https://opensea.io/assets?search[query]=" + encodeURI(nft.contract.openSea.collectionName)
      };
    });
    ui.setState({ nfts: owned });
  }

  const nftsTable = ui.table("nfts", nfts, {
    label: "NFTs",
    columns: {
      tokenId: { label: "token Id", isId: true }, // first column is id by default
      title: { label: "Title" },
      thumbnail: { label: "Thumbnail", format: "image" }, // <- image
      description: { label: "Description" },
      type: { label: "Token Type" },
      address: { label: "Contract Address" , format: "link"},
      name: { label: "Contract Name" },
      safelistRequestStatus: { label: "Safe list"},
      floorPrice: {label: "floor Price", format: "0.0000"},
      opensea: { label: "OpenSea Details" , format: "link"}
    },
  });

  const [selectedNFTs] = nftsTable.selection;
  if (selectedNFTs) {
    //ui.log("🌅🌅🌅 You selected: ", selectedNFTs);
    await ui.modal("modal", async (ui) => {
      ui.md`# 🌅 NFT Details  
       * Title: **${selectedNFTs.title}**
       * Token Id: **${selectedNFTs.tokenId}**
       * Address: **${selectedNFTs.address}**
       * Description: ${selectedNFTs.description}
      `;

      let nftImg = selectedNFTs.thumbnail;
      if (!nftImg) {
        nftImg = "https://cdn.glitch.global/3b2d349e-d8c0-4520-9208-afe1a374a8bd/no-img.png?v=1676162410120";
      }
      const img = ui.image("img", {
        src: nftImg,
        size: "m"
      });
      ui.md`~ {img} ~`;

      // ui.toast((await ui.confirm({ text: "Are you sure you wish to report it as SPAM?" }))
      //     ? 'Okay! It is reported!'
      //     : 'No worries 👊🏽');
      const markSpamButton = ui.button("markSpamButton", { label: "Report it as SPAM!" });
      if (markSpamButton.didClick) {
        // TODO
        console.log("call the report SPAM API");
        ui.toast("👊🏽 Done! It's marked it as spam.");
        ui.close();
      }

      const close = ui.button("close", { label: "Cancel" });
      if (close.didClick) {
        ui.toast("🥂 No worries");
        ui.close();
      }
    });

  }

});