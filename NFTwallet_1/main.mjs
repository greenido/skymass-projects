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
  //const address = "0x84A3e86beF9f31472453688bEf6d7f9b48e382a3";  //"elanhalpern.eth";
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
    defaultVal: "0x84A3e86beF9f31472453688bEf6d7f9b48e382a3",
  });

  const go = ui.button("button", {
    disabled: !address.isReady, // disable until input is in a valid state... (eg not blank)
    label: "Go!",
  });

  if (go.didClick) {
    ui.toast("👋🏼 Fetching all your NFTs and filtering the spam ones!");
    const result = await alchemy.nft.getNftsForOwner(address.val, {
      excludeFilters: [NftFilters.SPAM],
    });
    // convert results into an array good for showing in a table
    const owned = result.ownedNfts.map((nft) => {
      let nftName = "No name :/";
      if (nft.title == "#9338") {
        console.log("=================  9338  ===================");
        console.log(nft);
        console.log("====================================");
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
        tokenId: nft.tokenId,
        title: nft.title,
        thumbnail: nftImg,
        description: nft.description,
        type: nft.tokenType,
        address: nft.contract.address,
        name: nftName,
        opensea: JSON.stringify(nft.contract.openSea)
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
      address: { label: "Contract Address" },
      name: { label: "Contract Name" },
      opensea: { label: "OpenSea Details" , format: "code"}
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