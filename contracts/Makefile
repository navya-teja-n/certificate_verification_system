.PHONY: install build test test-verbose coverage format format-check clean deploy-sepolia anvil

# One-time setup: pull forge-std and OpenZeppelin (or, if lib/ already has
# them registered as submodules, just syncs to the pinned versions)
install:
	forge install foundry-rs/forge-std
	forge install OpenZeppelin/openzeppelin-contracts

build:
	forge build

test:
	forge test

test-verbose:
	forge test -vvv

coverage:
	forge coverage

format:
	forge fmt

format-check:
	forge fmt --check

clean:
	forge clean

# Local chain for manual testing (run in a separate terminal)
anvil:
	anvil

# Requires contracts/.env with PRIVATE_KEY, SEPOLIA_RPC_URL, ETHERSCAN_API_KEY
deploy-sepolia:
	forge script script/DeployCertificateRegistry.s.sol:DeployCertificateRegistry \
		--rpc-url sepolia --broadcast --verify -vvvv
