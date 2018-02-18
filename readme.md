# Cjdnstool

Diagnostic tools for cjdns

## Install
(you might also want to install [cjdns](https://github.com/cjdelisle/cjdns.git))

```bash
npm install -g cjdnstool
```

## Use

```bash
$ cjdnstool
Usage: cjdnstool COMMAND OPTIONS
cjdnstool ping [OPTIONS] <nodename|ipv6|hostname>
    -k, --keyping                 # send switch ping requesting the key
    -s, --switchping              # send switch ping (requires -k)
    -d <data>, --data=<data>      # send extra data in the ping message
    -c <num>, --count=<num>       # number of pings to send before stopping
    -v, --verbose                 # print debug information
    -i <secs>, --waittime=<secs>  # number of seconds between messages
    -p <pref>, --pref=<pref>      # use specified address resolution preference

cjdnstool query COMMAND
    getpeers [-2][-v] <nodename|ipv6|hostname>
        -2                        # request from the subnode pathfinder
        -v, --verbose             # print debug information
        -p <pref>, --pref=<pref>  # use specified address resolution preference

cjdnstool peer COMMAND
    show (default command)
        -6, --ip6                 # print ipv6 of peers rather than pubkeys

cjdnstool session [COMMAND]
    show (default command)
        -6, --ip6                 # print ipv6 of sessions rather than pubkeys

cjdnstool util COMMAND
    key2ip6 <pubkey>[ <pubkey>][ <pubkey>][...]

cjdnstool mon COMMAND
    pf                            # monitor pathfinder traffic
    ctrl                          # monitor switch control traffic

cjdnstool resolve OPTIONS <hostname|ipv6>
    -v, --verbose                 # print debug information
    -p <pref>, --pref=<pref>      # use specified address resolution preference

cjdnstool cexec [COMMAND ARGS...]
                                  # run `cjdnstool cexec` for all commands
                                  # below are a couple of examples
    Allocator_bytesAllocated      # Determine how many bytes are allocated
    Core_pid                      # Get the cjdns core pid number
    ReachabilityCollector_getPeerInfo
        --page=<Int>              # Get information about your peers (paginated)
    SupernodeHunter_status        # Get a status report from the snode hunter
    see: https://github.com/cjdelisle/cjdns/blob/crashey/doc/admin-api.md#funcs

cjdnstool log [OPTIONS]
    -v <verb>, --verbosity=<verb> # specify the verbosity level of logging
                                  # one of DEBUG, INFO, WARN, ERROR, CRITICAL
                                  # each level implies the levels above it
                                  # INFO will include WARN, ERROR and CRITICAL
    -f <file>, --file=<file>      # limit logging to one file
    -l <line>, --line=<line>      # limit logging to a specific line number
```

### cjdnstool ping

cjdnstool ping allows you to send pathfinder pings and switch pings.
Unlike ICMP pings, both pathfinder pings and switch pings will be routed back according
the the same path which they took (this is critical to  the pathfinder that it's probe
messages come back on the same path so these pings do as well).

If you send a pathfinder ping and it comes back, you know that the CryptoAuth session is
working well and that your path to the other node is ok. However, it does not tell you
whether the other node's path back to you is working.

If a pathfinder ping fails to return, you can use a switch ping `-s` to check whether anything
is at the end of the path or if it is a dead path. If you request a key ping `-k` then
it the node at the end of the path will tell you it's key which will help you determine
whether it is the node which you (or your cjdns instance) think is at the end of the path.

#### Options

* `-s`, `--switchping`: Send a switch CTRL ping message rather than a pathfinder query
* `-k`, `--keyping`: If the message is a switch ping, send a request for the other party's
public key.
* `-d <data>`, `--data=<data>`: Send specific content in the message
* `-c <num>`, `--count=<num>`: Send this many probes and then exit
* `-v`, `--verbose`: Print additional debugging information
* `-i <secs>`, `--waittime=<secs>`: Wait this many seconds between sending messages
(can be decimal)
* `-p <pref>`, `--pref=<pref>`: Use the specified resolution preference, for example
`session,snode,pf` (the default) will try first to use what is in the session manager,
then it will try querying the supernode, then it will try the old pathfinder. If you
specify only 1 or 2 of the 3 options, the other option(s) will be skipped which may result
in a failure to resolve the domain.

#### Example

```
$ cjdnstool ping irc.fc00.io
pathfinder ping v20.0000.0000.0027.82a3.fdud7rqg7puz4hf6u4kztfku0pbujw88l29s4ugwhf61vgqv6cj0.k (resolved from [session])
1518729009 v20.0000.0000.0027.82a3.fdud7rqg7puz4hf6u4kztfku0pbujw88l29s4ugwhf61vgqv6cj0.k seq=0 time=150ms
1518729010 v20.0000.0000.0027.82a3.fdud7rqg7puz4hf6u4kztfku0pbujw88l29s4ugwhf61vgqv6cj0.k seq=1 time=149ms
^C
$ cjdnstool ping irc.fc00.io -s
ctrl PING 0000.0000.0027.82a3 (resolved from [session])
1518729017 0000.0000.0027.82a3 v=20 seq=0 time=148ms
1518729018 0000.0000.0027.82a3 v=20 seq=1 time=147ms
^c
$ cjdnstool ping irc.fc00.io -s -k
ctrl KEYPING 0000.0000.0027.82a3 (resolved from [session])
1518729042 0000.0000.0027.82a3 fdud7rqg7puz4hf6u4kztfku0pbujw88l29s4ugwhf61vgqv6cj0.k v=20 seq=0 time=175ms
1518729043 0000.0000.0027.82a3 fdud7rqg7puz4hf6u4kztfku0pbujw88l29s4ugwhf61vgqv6cj0.k v=20 seq=1 time=146ms
^C
$
```

### cjdnstool query getpeers

Send a sequence of pathfinder GetPeers queries to the other node and print the result.
The GetPeers query does not return all of the peers of a given node in one shot, multiple
queries must be made in order to get the whole list.

Because of a bug in v20 nodes, the subnode pathfinder does not always know about all peers,
this bug was fixed in v20.1 but for some nodes it persists. By defauly this tool will
make a query which is handled by the old pathfinder which has no such bug but by passing
the `-2` flag, you can query the subnode pathfinder.

#### Options

* `-2`: Flag the query in such a way that it will be handled by the *subnode* pathfinder
rather than by the old pathfinder.
* `-v`, `--verbose`: Print additional debugging information
* `-p <pref>`, `--pref=<pref>`: Use the specified resolution preference, for example
`session,snode,pf` (the default) will try first to use what is in the session manager,
then it will try querying the supernode, then it will try the old pathfinder. If you
specify only 1 or 2 of the 3 options, the other option(s) will be skipped which may result
in a failure to resolve the domain.

#### Example

```
$ cjdnstool query getpeers irc.fc00.io
Peers for v20.0000.0000.0007.cd45.fdud7rqg7puz4hf6u4kztfku0pbujw88l29s4ugwhf61vgqv6cj0.k (resolved from [snode])
v20.0000.0000.0000.0001.fdud7rqg7puz4hf6u4kztfku0pbujw88l29s4ugwhf61vgqv6cj0.k
v20.0000.0000.0000.0082.p0tsd5589yy3ph769ktk5cwcgkubqjdtrlhsq3hjsy9wwlhjhfk0.k
v20.0000.0000.0000.0086.1941p5k8qqvj17vjrkb9z97wscvtgc1vp8pv1huk5120cu42ytt0.k
v20.0000.0000.0000.008a.8hgr62ylugxjyyhxkz254qtz60p781kbswmhhywtbb5rpzc5lxj0.k
v20.0000.0000.0000.0092.2z5lkm9d7c8rbc77qty33sfv050mj5fpc6wjfbbqjyb7kxbrxvj0.k
v20.0000.0000.0000.0096.5lt1py8x0mfy1h44gmp7b2277t2t3mv5ppt56gpgyhgbwjunf020.k
v20.0000.0000.0000.009a.u64fnj4b3s0mcbgf9zfh08qbxh556p8z2z2plw2qp97bpcdg6gf0.k
v20.0000.0000.0000.009e.7jljkrtc4t6g87styqmbgj6d2ff2jlq4yhnzq85lnwp4tydu19q0.k
v20.0000.0000.0000.00a2.ywx5ykk2xnnpth9wqbzb59whpzlqx95zrpyg2u6xukf85y6zws10.k
v20.0000.0000.0000.00a6.ubbtkp0txwjh44v8kkznvhjqqwr1hd2jzv5ms9zlkfk25svxvtg0.k
v20.0000.0000.0000.00aa.hyj4xmkz00z02vf5n3cwft2yfgg91dfmmq7stjjz09w4lxgnxkz0.k
v20.0000.0000.0000.00ae.7vgm4mwzhuc8wjx4grd5km66qtb641llyv48g8qvcfntvy772820.k
v20.0000.0000.0000.00b2.5wfwcfyhpn3gkmy89r9prw1csx4t4q4nbmscqp040bzmm7mbh8b0.k
v20.0000.0000.0000.00b6.ckpd4v8sgwsds7vx1qhdm8uufnj62wb0l4pgzns3zxc4whv3brq0.k
v20.0000.0000.0000.00ba.2hwmvzgxhy6h02zsk81cz2h4ybwh1hxjtsk7j8cu9954lzwgu8t0.k
v20.0000.0000.0000.00be.5msc47cgr8h1bqtnq9xyb0hr9rbqp2qlq3t1v14rk5y727z03390.k
v20.0000.0000.0000.00c2.6bb1kywn12w8n3crvzx7r21d2x4j4bst4zythd3rrnvckjtu0sq0.k
v20.0000.0000.0000.00c6.11sfkq2clbv4dgzgx8hm47p4ld9pwy82y7jluvjh91cyl1n7bwf0.k
Total 18 peers
$
```

### cjdnstool peer show

Print a list of the peers of this node according to the InterfaceController. This is
equivilent to `./tools/peerStats`

#### Options

* `-6`, `--ip6`: Print peers with their cjdns IPv6 rather than their pubkeys

### cjdnstool session show

Print a list of the active sessions of this node according to the SessionManager.
This is equivilent to `./tools/sessionStats`

#### Options

* `-6`, `--ip6`: Print sessions with their cjdns IPv6 rather than their pubkeys

### cjdnstool util key2ip6

Convert one or more cjdns public keys into cjdns IPv6 addresses. This command has no options.

#### Example

```
$ cjdnstool util key2ip6 kw0vfw3tmb6u6p21z5jmmymdlumwknlg3x8muk5mcw66tdpqlw30.k cmnkylz1dx8mx3bdxku80yw20gqmg0s9nsrusdv0psnxnfhqfmu0.k
kw0vfw3tmb6u6p21z5jmmymdlumwknlg3x8muk5mcw66tdpqlw30.k fc02:2735:e595:bb70:8ffc:5293:8af8:c4b7
cmnkylz1dx8mx3bdxku80yw20gqmg0s9nsrusdv0psnxnfhqfmu0.k fcbb:5056:899e:2838:f1ad:12eb:9704:1ff1
$
```

### cjdnstool mon pf

Monitor incoming and outgoing inter-pathfinder traffic in cjdns, each message will start with
an arrow pointing either left or right. If it points left then the message is outgoing and if
it points right then the message is incoming. This command has no options.

#### Example

```
$ node ./cjdnstool.js mon pf
> v17 0000.0000.000a.e553 fcfd:9511:69cc:a05e:4eb2:ed20:c6a0:52e3 fn fcdb:4cd0:d748:0b1f:4eaf:5c9e:8cd9:b815
< v17 0000.0000.000a.e553 fcfd:9511:69cc:a05e:4eb2:ed20:c6a0:52e3 reply
> v17 0000.0000.000a.e553 fcfd:9511:69cc:a05e:4eb2:ed20:c6a0:52e3 fn fcdb:4cd0:d748:0b1f:4eaf:5c9e:8cd9:b815
< v17 0000.0000.000a.e553 fcfd:9511:69cc:a05e:4eb2:ed20:c6a0:52e3 reply
^C
$
```

### cjdnstool mon ctrl

Monitor incoming and outgoing switch CTRL traffic on this cjdns node. Each message will begin
with an arrow pointing either left or right, if it points left then this is an outgoing
message and if it points right then it's an incoming message. This command has no options.

#### Example

```
$ node ./cjdnstool.js mon ctrl
Listening for CTRL traffic on node
> 0000.0000.0006.f7a5 ERROR AUTHENTICATION label_at_err_node: 64e9.4c00.0000.0000 nonce: 1 00d596edf689e7fe14de00000000000b00000000
> 0000.0000.0006.4dc5 ERROR AUTHENTICATION label_at_err_node: cc12.2000.0000.0000 nonce: 1 00866a1edb69ced59e0800000000000b00000000
^C
$
```

### cjdnstool resolve

Resolve a hostname or cjdns IPv6 address to a version, path and key which can be used for sending
a ping. This resolution happens every time you start a session with a previously unknown node.

The resolution may come from either an already known session in the SessionManager, or from the
supernode or from the old pathfinder. By default this command will return all of them.

With the session manager result there will be a metric, specifying how valuable the information is
considered (lower is better).

* `metric=fff00000`: means the SessionManager discovered the node because it's a peer.
* `metric=fff00033`: means the SessionManager discovered the path from the supernode.
* `metric=ffff0000`: means the SessionManager discovered the path from the old pathfinder.

#### Options

* `-v`, `--verbose`: Print additional debugging information
* `-p <pref>`, `--pref=<pref>`: Use the specified resolution preference, for example
`session,snode,pf` (the default) will try first to use what is in the session manager,
then it will try querying the supernode, then it will try the old pathfinder. If you
specify only 1 or 2 of the 3 options, the other option(s) will be skipped which may result
in a failure to resolve the domain.

#### Example
```
$ cjdnstool resolve irc.fc00.io -p pf,snode
Resolving irc.fc00.io
snode   v20.0000.0000.0004.d005.fdud7rqg7puz4hf6u4kztfku0pbujw88l29s4ugwhf61vgqv6cj0.k
pf      v20.0000.0000.0004.d005.fdud7rqg7puz4hf6u4kztfku0pbujw88l29s4ugwhf61vgqv6cj0.k
$ cjdnstool resolve irc.fc00.io -p session
Resolving irc.fc00.io
session v20.0000.0000.0007.cd45.fdud7rqg7puz4hf6u4kztfku0pbujw88l29s4ugwhf61vgqv6cj0.k metric=fff00033
$
```

### cjdnstool cexec

Execute a direct RPC call to the cjdns engine. Everything in cjdnstool uses these RPCs
to access data from and to control cjdns but this is a raw access to the cjdns RPC calls.
There are many calls which are documented to varying extents. The names of the calls
always begin with the name of the .c file where they are defined so even if the call is
not well documented, finding the source code is reasonable.

The best documentation to be found on these RPC calls is here:
https://github.com/cjdelisle/cjdns/blob/master/doc/admin-api.md#cjdns-functions

In general it's better to use the tools provided in cjdnstool but if you want to access
something internal, these RPCs are the best option.

#### Options

Each RPC call has different options which are shown when you execute `cjdnstool cexec`
with no arguments. All options must be in the form `--<name>=<value>` and if the option
is shown in square brackets, it is optional.

#### Example

```
$ cjdnstool cexec ReachabilityCollector_getPeerInfo --page=0
{
  "error": "none",
  "peers": [
    {
      "addr": "v20.0000.0000.0000.0015.kw0vfw3tmb6u6p21z5jmmymdlumwknlg3x8muk5mcw66tdpqlw30.k",
      "pathThemToUs": "0000.0000.0000.04cc",
      "querying": 0
    },
    {
      "addr": "v20.0000.0000.0000.0013.cmnkylz1dx8mx3bdxku80yw20gqmg0s9nsrusdv0psnxnfhqfmu0.k",
      "pathThemToUs": "0000.0000.0000.00b6",
      "querying": 0
    }
  ]
}
$
```

### cjdnstool log

Cjdns DEBUG level logging is more like a sort of tracepoint or kprobe, when you enable logging
it prints a fantastic amount of noise. Fortunartely for performance, the logs are not even
created inside of cjdns unless logging is enabled. You can enable logging on a verbosity,
per-file and per-line basis.

For example `cjdnstool log -f CryptoAuth.c` will take all logs from CryptoAuth file.
`cjdnstool log -v INFO` will collect logs at INFO level or higher.
`cjdnstool log -f CryptoAuth.c -l 727` will collect logs only from one line in the CryptoAuth
file (assuming there is a log line there).

If you call `cjdnstool log` with no arguments, it will simply print all logs.

#### Options

Each option can be specified only once, but options can be used together.

* `-v <verb>`, `--verbosity=<verb>`: Specify the level of verbosity for logging, each level
implies the higher levels so if you specify INFO, it will log INFO, WARN and CRITICAL levels.
* `-f <file>`, `--file=<file>`: Limit logging to one file, this helps when you only want to
see what's going on inside of one particular module.
* `-l <line>`, `--line=<line>`: Limit logging to one specific line number, this is
most useful in conjunction with `--file` to only listen to invocations of one particular log
line.

#### Example

```
$ cjdnstool log
1483311804 DEBUG SessionManager.c:380 ver[17] send[18269] recv[379733] ip[fcc7:91f7:ab6f:85b7:5bfc:790a:31c8:dd38] path[0000.0000.0037.91c5] new session nonce[3]
1483311804 DEBUG CryptoAuth.c:628 0x7ff313e860b8 inner [fcc7:91f7:ab6f:85b7:5bfc:790a:31c8:dd38] state[0]: Received a repeat key packet
1483311804 DEBUG CryptoAuth.c:631 0x7ff313e860b8 inner [fcc7:91f7:ab6f:85b7:5bfc:790a:31c8:dd38] state[0]: DROP a stray key packet
1483311804 DEBUG SessionManager.c:391 ver[17] send[18269] recv[379733] ip[fcc7:91f7:ab6f:85b7:5bfc:790a:31c8:dd38] path[0000.0000.0037.91c5] DROP Failed decrypting message NoH[3] state[INIT]
1483311804 DEBUG SessionManager.c:380 ver[17] send[18269] recv[379733] ip[fcc7:91f7:ab6f:85b7:5bfc:790a:31c8:dd38] path[0000.0000.0037.91c5] new session nonce[3]
1483311804 DEBUG CryptoAuth.c:628 0x7ff313e860b8 inner [fcc7:91f7:ab6f:85b7:5bfc:790a:31c8:dd38] state[0]: Received a repeat key packet
^CDisconnecting...
done
$ cjdnstool log -v INFO
1483311840 INFO SwitchCore.c:194 no such iface
1483311841 INFO ControlHandler.c:224 DROP ctrl packet from [0000.000d.a193.4585] with invalid checksum
1483311842 INFO SwitchCore.c:194 no such iface
^CDisconnecting...
done
$ node cjdnstool log -f ControlHandler.c -l 224
1483311886 INFO ControlHandler.c:224 DROP ctrl packet from [0000.5750.a6c4.23a3] with invalid checksum
^CDisconnecting...
done
$
```

