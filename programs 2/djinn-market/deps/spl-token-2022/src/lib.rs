use solana_program::{declare_id, pubkey::Pubkey, entrypoint::ProgramResult};

declare_id!("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

pub mod extension {
    pub enum ExtensionType {
        MintCloseAuthority,
        TransferFeeConfig,
        ConfidentialTransferMint,
        DefaultAccountState,
        ImmutableOwner,
        MemoTransfer,
        NonTransferable,
        InterestBearingConfig,
        CpiGuard,
        PermanentDelegate,
    }

    pub struct StateWithExtensions<T> {
        _phantom: std::marker::PhantomData<T>,
    }
    impl<T> StateWithExtensions<T> {
        pub fn unpack(_input: &[u8]) -> Result<T, solana_program::program_error::ProgramError> {
             Err(solana_program::program_error::ProgramError::InvalidAccountData)
        }
    }
}

pub mod instruction {
    use solana_program::program_error::ProgramError;
    use solana_program::pubkey::Pubkey;
    use crate::extension::ExtensionType;
    use solana_program::instruction::Instruction;

    pub enum TokenInstruction {}
    
    pub fn get_account_data_size(
        _program_id: &Pubkey,
        _mint: &Pubkey,
        _extension_types: &[ExtensionType],
    ) -> Result<Instruction, ProgramError> {
         Ok(Instruction {
            program_id: *_program_id,
            accounts: vec![],
            data: vec![],
        })
    }
    
    pub fn initialize_immutable_owner(
        token_program_id: &Pubkey,
        _account_pubkey: &Pubkey,
    ) -> Result<Instruction, ProgramError> {
        Ok(Instruction {
            program_id: *token_program_id,
            accounts: vec![],
            data: vec![],
        })
    }

    pub fn initialize_account3(
        token_program_id: &Pubkey,
        _account_pubkey: &Pubkey,
        _mint_pubkey: &Pubkey,
        _authority_pubkey: &Pubkey,
    ) -> Result<Instruction, ProgramError> {
        Ok(Instruction {
            program_id: *token_program_id,
            accounts: vec![],
            data: vec![],
        })
    }

    pub fn transfer_checked(
        token_program_id: &Pubkey,
        source_pubkey: &Pubkey,
        mint_pubkey: &Pubkey,
        destination_pubkey: &Pubkey,
        authority_pubkey: &Pubkey,
        signer_pubkeys: &[&Pubkey],
        amount: u64,
        decimals: u8,
    ) -> Result<Instruction, ProgramError> {
        Ok(Instruction {
            program_id: *token_program_id,
            accounts: vec![],
            data: vec![],
        })
    }

    pub fn close_account(
        token_program_id: &Pubkey,
        account_pubkey: &Pubkey,
        destination_pubkey: &Pubkey,
        owner_pubkey: &Pubkey,
        signer_pubkeys: &[&Pubkey],
    ) -> Result<Instruction, ProgramError> {
         Ok(Instruction {
            program_id: *token_program_id,
            accounts: vec![],
            data: vec![],
        })
    }
}

pub mod state {
    use spl_token::state::{Mint as SplMint, Account as SplAccount};

    pub struct Mint {
        pub base: SplMint,
    }

    pub struct Account {
        pub base: SplAccount,
    }
}

pub mod processor {
    pub struct Processor;
}

pub fn check_program_account(_: &Pubkey) -> ProgramResult {
    Ok(())
}
