{
  description = "Willhaben Property Scraper";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay.url = "github:oxalica/rust-overlay";
    sops-nix.url = "github:Mic92/sops-nix";
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay, sops-nix }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs {
          inherit system overlays;
        };

        rustToolchain = pkgs.rust-bin.stable.latest.default.override {
          extensions = [ "rust-src" "rust-analyzer" ];
        };

        commonRustDeps = with pkgs; [
          rustToolchain
          cargo
          rustc
          pkg-config
          openssl
          dialoguer
        ];

        sopsPackage = pkgs.sops;

      in {
        packages = {
          default = pkgs.stdenv.mkDerivation {
            pname = "willhaben-property-scraper";
            version = "0.1.0";
            src = self;

            buildInputs = with pkgs; [
              nodejs
              nodePackages.pkg
              sopsPackage
            ];

            buildPhase = ''
              # Decrypt secrets before building
              ${sopsPackage}/bin/sops -d ./secrets/secrets.yaml > ./secrets/decrypted.yaml
              npm ci
              npx pkg index.js -t node18-linux-arm64 -o $out/bin/willhaben-scraper
            '';

            installPhase = ''
              mkdir -p $out/bin
            '';
          };

          install = pkgs.rustPlatform.buildRustPackage {
            pname = "willhaben-scraper-installer";
            version = "0.1.0";
            src = ./install;

            cargoLock = {
              lockFile = ./install/Cargo.lock;
            };

            buildInputs = with pkgs; [
              openssl
              pkg-config
              dialoguer
            ];
          };

          uninstall = pkgs.rustPlatform.buildRustPackage {
            pname = "willhaben-scraper-uninstaller";
            version = "0.1.0";
            src = ./uninstall;

            cargoLock = {
              lockFile = ./uninstall/Cargo.lock;
            };

            buildInputs = with pkgs; [
              openssl
              pkg-config
              dialoguer
            ];
          };
        };

        devShells = {
          default = pkgs.mkShell {
            buildInputs = with pkgs; [
              nodejs
              nodePackages.npm
              nodePackages.pkg
              sopsPackage
              ssh-to-age
            ];

            shellHook = ''
              export SOPS_AGE_KEY=$(ssh-to-age -i ~/.ssh/id_ed25519 -private-key)
              echo "SOPS_AGE_KEY set for this shell session"
            '';
          };

          rust-install = pkgs.mkShell {
            buildInputs = commonRustDeps;
          };

          rust-uninstall = pkgs.mkShell {
            buildInputs = commonRustDeps;
          };
        };
      }
    );
}
